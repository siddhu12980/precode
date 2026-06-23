import { createAnonymousSession, getAnonymousSession, serializeSession } from "@/app/lib/anonymous-sessions";
import {
  AbuseControlConfigError,
  applyVisitorCookie,
  bindAnonymousSession,
  burstWindowTtlSeconds,
  burstKey,
  dailyKey,
  enforceWindowLimits,
  envInt,
  getBoundAnonymousSessionId,
  getOrCreateAnonymousVisitor,
  hashRequestIdentity,
  sessionKey,
  withRedisLock,
} from "@/app/lib/anonymous-abuse-controls";
import { toPublicInfrastructureError } from "@/app/lib/public-error-messages";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const visitor = await getOrCreateAnonymousVisitor(request);
    const ipHash = hashRequestIdentity(request);
    const dailyLimit = envInt("ANON_DAILY_SESSION_LIMIT", 3);
    const visitorDailyWindow = dailyKey("v", visitor.visitorId);
    const ipDailyWindow = dailyKey("i", ipHash);

    const session = await withRedisLock(sessionKey("lock:create", visitor.visitorId), 20, async () => {
      const boundSessionId = await getBoundAnonymousSessionId(visitor.visitorId);

      if (boundSessionId) {
        const existingSession = await getAnonymousSession(boundSessionId);

        if (existingSession) {
          return existingSession;
        }
      }

      await enforceWindowLimits([
        { key: visitorDailyWindow.key, field: "sessions", limit: dailyLimit, ttlSeconds: visitorDailyWindow.ttlSeconds },
        { key: ipDailyWindow.key, field: "sessions", limit: dailyLimit * 3, ttlSeconds: ipDailyWindow.ttlSeconds },
        { key: burstKey("sessions:v", visitor.visitorId), limit: 3, ttlSeconds: burstWindowTtlSeconds() },
        { key: burstKey("sessions:i", ipHash), limit: 6, ttlSeconds: burstWindowTtlSeconds() },
      ]);

      const session = await createAnonymousSession();
      await bindAnonymousSession(visitor.visitorId, session.id);
      return session;
    });

    return applyVisitorCookie(
      NextResponse.json({
        session: serializeSession(session),
      }),
      visitor,
    );
  } catch (error) {
    if (error instanceof AbuseControlConfigError || error instanceof Error) {
      console.error("Anonymous session creation blocked", error);
    }

    const publicError = toPublicInfrastructureError(error, {
      message: "Anonymous usage controls are temporarily unavailable.",
      status: 503,
    });

    return Response.json({ error: publicError.message }, { status: publicError.status });
  }
}
