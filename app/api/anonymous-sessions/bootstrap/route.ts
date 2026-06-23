import { addUserMessage, createAnonymousSession, getAnonymousSession, serializeSession } from "@/app/lib/anonymous-sessions";
import {
  AbuseControlConfigError,
  RateLimitError,
  RedisLockError,
  anonymousMessageCharLimit,
  applyVisitorCookie,
  bindAnonymousSession,
  burstKey,
  burstWindowTtlSeconds,
  dailyKey,
  enforceWindowLimits,
  envInt,
  getBoundAnonymousSessionId,
  getOrCreateAnonymousVisitor,
  hashRequestIdentity,
  isProviderChargeUnclear,
  releaseAnonymousAiUsage,
  reserveAnonymousAiUsage,
  sessionKey,
  withRedisLock,
} from "@/app/lib/anonymous-abuse-controls";
import { createGroqArchitectReply } from "@/app/lib/groq-architect";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const messageCharLimit = anonymousMessageCharLimit();

  if (!content) {
    return Response.json({ error: "Message content is required." }, { status: 400 });
  }

  if (content.length > messageCharLimit) {
    return Response.json({ error: `Message content must be ${messageCharLimit} characters or fewer.` }, { status: 413 });
  }

  try {
    const visitor = await getOrCreateAnonymousVisitor(request);
    const ipHash = hashRequestIdentity(request);
    const messageDailyLimit = envInt("ANON_DAILY_MESSAGE_LIMIT", 10);
    const sessionDailyLimit = envInt("ANON_DAILY_SESSION_LIMIT", 3);
    const visitorDailyWindow = dailyKey("v", visitor.visitorId);
    const ipDailyWindow = dailyKey("i", ipHash);

    const result = await withRedisLock(sessionKey("lock:bootstrap", visitor.visitorId), 45, async () => {
      let sessionId = await getBoundAnonymousSessionId(visitor.visitorId);
      let session = sessionId ? await getAnonymousSession(sessionId) : null;

      if (!session) {
        await enforceWindowLimits([
          { key: visitorDailyWindow.key, field: "sessions", limit: sessionDailyLimit, ttlSeconds: visitorDailyWindow.ttlSeconds },
          { key: ipDailyWindow.key, field: "sessions", limit: sessionDailyLimit * 3, ttlSeconds: ipDailyWindow.ttlSeconds },
          { key: burstKey("sessions:v", visitor.visitorId), limit: 3, ttlSeconds: burstWindowTtlSeconds() },
          { key: burstKey("sessions:i", ipHash), limit: 6, ttlSeconds: burstWindowTtlSeconds() },
        ]);

        const createdSession = await createAnonymousSession();
        await bindAnonymousSession(visitor.visitorId, createdSession.id);
        sessionId = createdSession.id;
        session = createdSession;
      }

      if (!sessionId) {
        return {
          ok: false as const,
          status: 500,
          error: "Unable to start a Precode session.",
        };
      }

      await enforceWindowLimits([
        { key: visitorDailyWindow.key, field: "messages", limit: messageDailyLimit, ttlSeconds: visitorDailyWindow.ttlSeconds },
        { key: ipDailyWindow.key, field: "messages", limit: messageDailyLimit * 3, ttlSeconds: ipDailyWindow.ttlSeconds },
        { key: burstKey("messages:v", visitor.visitorId), limit: 5, ttlSeconds: burstWindowTtlSeconds() },
        { key: burstKey("messages:i", ipHash), limit: 15, ttlSeconds: burstWindowTtlSeconds() },
      ]);

      return withRedisLock(sessionKey("lock:messages", sessionId), 45, () =>
        addUserMessage(sessionId, content, async (input) => {
          const reservation = await reserveAnonymousAiUsage(visitor.visitorId, "message");

          if (!reservation.allowed) {
            throw new RateLimitError("Anonymous message quota reached. Sign in or wait for the cooldown before trying again.");
          }

          try {
            return await createGroqArchitectReply(input);
          } catch (error) {
            if (!isProviderChargeUnclear(error)) {
              await releaseAnonymousAiUsage(reservation);
            }

            throw error;
          }
        }),
      ).catch((error) => {
        if (error instanceof RateLimitError || error instanceof RedisLockError) {
          throw error;
        }

        console.error("Precode response failed", error);
        return {
          ok: false as const,
          status: 502,
          error: "Precode response failed.",
        };
      });
    });

    if (!result.ok) {
      return applyVisitorCookie(NextResponse.json({ error: result.error }, { status: result.status }), visitor);
    }

    return applyVisitorCookie(
      NextResponse.json({
        session: serializeSession(result.session),
        userMessage: result.userMessage,
        assistantMessage: result.assistantMessage,
      }),
      visitor,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429 });
    }

    if (error instanceof RedisLockError) {
      return Response.json({ error: "A Precode session is already starting. Wait a moment and try again." }, { status: 409 });
    }

    if (error instanceof AbuseControlConfigError || error instanceof Error) {
      console.error("Anonymous bootstrap controls failed", error);
    }

    return Response.json({ error: "Anonymous usage controls are temporarily unavailable." }, { status: 503 });
  }
}

async function readJsonBody(request: Request) {
  const messageCharLimit = anonymousMessageCharLimit();
  const maxBodyBytes = messageCharLimit * 4 + 2048;
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > maxBodyBytes) {
    return null;
  }

  const raw = await request.text();

  if (Buffer.byteLength(raw) > maxBodyBytes) {
    return null;
  }

  try {
    return JSON.parse(raw) as { content?: unknown } | null;
  } catch {
    return null;
  }
}
