import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const VISITOR_COOKIE = "anon_visitor";
const DAY_SECONDS = 24 * 60 * 60;
const ACTIVE_SESSION_TTL_SECONDS = DAY_SECONDS;
const BURST_WINDOW_SECONDS = 60;
const DAY_WINDOW_GRACE_SECONDS = 5 * 60;
const LOCK_RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`.trim();

export type WindowLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  ttlSeconds: number;
};

export type AiUsageReservation = WindowLimitResult & {
  key: string;
  field: "ai_msg" | "ai_exp";
};

export type WindowLimitSpec = {
  key: string;
  field?: string;
  limit: number;
  ttlSeconds: number;
};

type VisitorCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  };
};

export type AnonymousVisitorContext = {
  visitorId: string;
  cookie: VisitorCookie | null;
};

let redisClient: Redis | null = null;

export function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new AbuseControlConfigError(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for anonymous abuse controls.",
    );
  }

  redisClient ??= new Redis({ url, token });
  return redisClient;
}

export async function incrementWindowLimit(key: string, limit: number, ttlSeconds: number): Promise<WindowLimitResult> {
  const redis = getRedis();
  const count = await redis.incr(key);

  await redis.expire(key, ttlSeconds);

  return {
    allowed: count <= limit,
    count,
    limit,
    remaining: Math.max(limit - count, 0),
    ttlSeconds,
  };
}

export async function incrementHashWindowLimit(
  key: string,
  field: string,
  limit: number,
  ttlSeconds: number,
): Promise<WindowLimitResult> {
  const redis = getRedis();
  const count = await redis.hincrby(key, field, 1);
  await redis.expire(key, ttlSeconds);

  return {
    allowed: count <= limit,
    count,
    limit,
    remaining: Math.max(limit - count, 0),
    ttlSeconds,
  };
}

export async function withRedisLock<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  const token = randomUUID();
  const acquired = await redis.set(key, token, { nx: true, ex: ttlSeconds });

  if (acquired !== "OK") {
    throw new RedisLockError("Another request is already processing for this session.");
  }

  try {
    return await fn();
  } finally {
    await redis.eval(LOCK_RELEASE_SCRIPT, [key], [token]).catch((error) => {
      console.error("Redis lock release failed", error);
    });
  }
}

export function hashRequestIdentity(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  return hmac(`${ip}:${userAgent}`);
}

export async function getOrCreateAnonymousVisitor(request: Request): Promise<AnonymousVisitorContext> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VISITOR_COOKIE)?.value;
  const existingId = verifySignedValue(existing);

  if (existingId) {
    return { visitorId: existingId, cookie: null };
  }

  const visitorId = `vis_${randomUUID()}`;
  const cookie: VisitorCookie = {
    name: VISITOR_COOKIE,
    value: signValue(visitorId),
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" || new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    },
  };

  cookieStore.set(cookie.name, cookie.value, cookie.options);
  return { visitorId, cookie };
}

export function applyVisitorCookie(response: NextResponse, visitorContext: AnonymousVisitorContext) {
  if (!visitorContext.cookie) {
    return response;
  }

  response.cookies.set(visitorContext.cookie.name, visitorContext.cookie.value, visitorContext.cookie.options);
  return response;
}

export function dailyKey(scope: string, identity: string) {
  const now = new Date();
  return {
    key: `a:d:${scope}:${compactIdentity(identity)}:${formatUtcDay(now)}`,
    ttlSeconds: secondsUntilNextUtcDay(now) + DAY_WINDOW_GRACE_SECONDS,
  };
}

export function burstKey(scope: string, identity: string) {
  return `a:b:${scope}:${compactIdentity(identity)}`;
}

export function sessionKey(scope: string, sessionId: string) {
  return `a:s:${scope}:${compactIdentity(sessionId)}`;
}

export function activeSessionKey(visitorId: string) {
  return `a:as:${compactIdentity(visitorId)}`;
}

export async function enforceWindowLimits(limits: WindowLimitSpec[]) {
  for (const limit of limits) {
    const result = limit.field
      ? await incrementHashWindowLimit(limit.key, limit.field, limit.limit, limit.ttlSeconds)
      : await incrementWindowLimit(limit.key, limit.limit, limit.ttlSeconds);

    if (!result.allowed) {
      throw new RateLimitError("Anonymous quota reached. Sign in or wait for the cooldown before trying again.");
    }
  }
}

export async function reserveAnonymousAiUsage(identity: string, kind: "message" | "export") {
  const dailyWindow = dailyKey("v", identity);
  const field = kind === "message" ? "ai_msg" : "ai_exp";
  const result = await incrementHashWindowLimit(
    dailyWindow.key,
    field,
    envInt(kind === "message" ? "ANON_DAILY_MESSAGE_LIMIT" : "ANON_DAILY_EXPORT_LIMIT", kind === "message" ? 10 : 2),
    dailyWindow.ttlSeconds,
  );

  return {
    ...result,
    key: dailyWindow.key,
    field,
  } satisfies AiUsageReservation;
}

export async function getBoundAnonymousSessionId(visitorId: string) {
  const redis = getRedis();
  const sessionId = await redis.get<string>(activeSessionKey(visitorId));
  return typeof sessionId === "string" && sessionId ? sessionId : null;
}

export async function bindAnonymousSession(visitorId: string, sessionId: string) {
  const redis = getRedis();
  await redis.set(activeSessionKey(visitorId), sessionId, { ex: ACTIVE_SESSION_TTL_SECONDS });
}

export async function clearBoundAnonymousSession(visitorId: string, sessionId?: string) {
  const redis = getRedis();
  const key = activeSessionKey(visitorId);

  if (!sessionId) {
    await redis.del(key);
    return;
  }

  await redis.eval(LOCK_RELEASE_SCRIPT, [key], [sessionId]).catch((error) => {
    console.error("Anonymous session binding release failed", error);
  });
}

export async function releaseAnonymousAiUsage(reservation: AiUsageReservation) {
  const redis = getRedis();

  try {
    const nextCount = await redis.hincrby(reservation.key, reservation.field, -1);

    if (nextCount <= 0) {
      await redis.hdel(reservation.key, reservation.field);

      if ((await redis.hlen(reservation.key)) === 0) {
        await redis.del(reservation.key);
      }
    }
  } catch (error) {
    console.error("Redis usage release failed", error);
  }
}

export function envInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function anonymousMessageCharLimit() {
  return envInt("ANON_MESSAGE_CHAR_LIMIT", 4000);
}

export function burstWindowTtlSeconds() {
  return BURST_WINDOW_SECONDS;
}

export function isProviderChargeUnclear(error: unknown) {
  if (!(error instanceof Error)) {
    return true;
  }

  return !/GROQ_API_KEY|network|fetch failed|timeout|empty/i.test(error.message);
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class RedisLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisLockError";
  }
}

export class AbuseControlConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbuseControlConfigError";
  }
}

function hmac(value: string) {
  const secret = process.env.RATE_LIMIT_SECRET;

  if (!secret) {
    throw new AbuseControlConfigError("RATE_LIMIT_SECRET is required for anonymous abuse controls.");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function compactIdentity(value: string) {
  return hmac(value).slice(0, 20);
}

function formatUtcDay(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function secondsUntilNextUtcDay(date: Date) {
  const nextUtcMidnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextUtcMidnight - date.getTime()) / 1000));
}

function signValue(value: string) {
  return `${value}.${hmac(value)}`;
}

function verifySignedValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  const separator = value.lastIndexOf(".");

  if (separator <= 0) {
    return null;
  }

  const raw = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = hmac(raw);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer) ? raw : null;
}
