import { createAnonymousSession, getAnonymousSession, serializeSession } from "@/app/lib/anonymous-sessions";
import {
  AbuseControlConfigError,
  RateLimitError,
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
} from "@/app/lib/anonymous-abuse-controls";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const visitor = await getOrCreateAnonymousVisitor(request);
    const ipHash = hashRequestIdentity(request);
    const dailyLimit = envInt("ANON_DAILY_SESSION_LIMIT", 3);
    const boundSessionId = await getBoundAnonymousSessionId(visitor.visitorId);

    if (boundSessionId) {
      const existingSession = await getAnonymousSession(boundSessionId);

      if (existingSession) {
        return applyVisitorCookie(
          NextResponse.json({
            session: serializeSession(existingSession),
          }),
          visitor,
        );
      }
    }

    await enforceWindowLimits([
      { key: dailyKey("v", visitor.visitorId).key, field: "sessions", limit: dailyLimit, ttlSeconds: dailyKey("v", visitor.visitorId).ttlSeconds },
      { key: dailyKey("i", ipHash).key, field: "sessions", limit: dailyLimit * 3, ttlSeconds: dailyKey("i", ipHash).ttlSeconds },
      { key: burstKey("sessions:v", visitor.visitorId), limit: 3, ttlSeconds: burstWindowTtlSeconds() },
      { key: burstKey("sessions:i", ipHash), limit: 6, ttlSeconds: burstWindowTtlSeconds() },
    ]);

    const session = await createAnonymousSession();
    await bindAnonymousSession(visitor.visitorId, session.id);

    return applyVisitorCookie(
      NextResponse.json({
        session: serializeSession(session),
      }),
      visitor,
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429 });
    }

    if (error instanceof AbuseControlConfigError || error instanceof Error) {
      console.error("Anonymous session creation blocked", error);
    }

    return Response.json({ error: "Anonymous usage controls are temporarily unavailable." }, { status: 503 });
  }
}
