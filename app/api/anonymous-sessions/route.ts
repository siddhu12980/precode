import { createAnonymousSession, getAnonymousSession, serializeSession } from "@/app/lib/anonymous-sessions";
import {
  AbuseControlConfigError,
  RateLimitError,
  applyVisitorCookie,
  bindAnonymousSession,
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
      { key: dailyKey("sessions:visitor", visitor.visitorId), limit: dailyLimit, ttlSeconds: 24 * 60 * 60 },
      { key: dailyKey("sessions:ip", ipHash), limit: dailyLimit * 3, ttlSeconds: 24 * 60 * 60 },
      { key: burstKey("sessions:visitor", visitor.visitorId), limit: 3, ttlSeconds: 60 },
      { key: burstKey("sessions:ip", ipHash), limit: 6, ttlSeconds: 60 },
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
