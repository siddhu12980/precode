import { createArchitectExport } from "@/app/lib/architect-export";
import { canExportSession, getAnonymousSession, saveSessionExport, serializeSession } from "@/app/lib/anonymous-sessions";
import {
  AbuseControlConfigError,
  RateLimitError,
  applyVisitorCookie,
  burstWindowTtlSeconds,
  burstKey,
  dailyKey,
  enforceWindowLimits,
  envInt,
  getOrCreateAnonymousVisitor,
  hashRequestIdentity,
  isProviderChargeUnclear,
  releaseAnonymousAiUsage,
  reserveAnonymousAiUsage,
  sessionKey,
  visitorOwnsAnonymousSession,
  withRedisLock,
} from "@/app/lib/anonymous-abuse-controls";
import { toPublicInfrastructureError } from "@/app/lib/public-error-messages";
import { logServerError } from "@/app/lib/server-error-log";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/anonymous-sessions/[sessionId]/export">) {
  const { sessionId } = await context.params;
  const regenerate = new URL(request.url).searchParams.get("regenerate") === "1";
  const visitor = await getOrCreateAnonymousVisitor(request);

  if (!(await visitorOwnsAnonymousSession(visitor.visitorId, sessionId))) {
    return applyVisitorCookie(NextResponse.json({ error: "Session not found." }, { status: 404 }), visitor);
  }

  const session = await getAnonymousSession(sessionId);

  if (!session) {
    return applyVisitorCookie(NextResponse.json({ error: "Session not found." }, { status: 404 }), visitor);
  }

  if (!canExportSession(session)) {
    return applyVisitorCookie(NextResponse.json({ error: "This session is not ready for export yet." }, { status: 409 }), visitor);
  }

  if (session.exportArtifact && !regenerate) {
    return applyVisitorCookie(
      NextResponse.json({
        session: serializeSession(session),
        exportArtifact: session.exportArtifact,
      }),
      visitor,
    );
  }

  try {
    const ipHash = hashRequestIdentity(request);
    const dailyLimit = envInt("ANON_DAILY_EXPORT_LIMIT", 2);
    const visitorDailyWindow = dailyKey("v", visitor.visitorId);
    const ipDailyWindow = dailyKey("i", ipHash);

    const exportSession = await withRedisLock(sessionKey("lock:export", sessionId), 90, async () => {
      const latestSession = await getAnonymousSession(sessionId);

      if (!latestSession) {
        return { ok: false as const, status: 404, error: "Session not found." };
      }

      if (!canExportSession(latestSession)) {
        return { ok: false as const, status: 409, error: "This session is not ready for export yet." };
      }

      if (latestSession.exportArtifact && !regenerate) {
        return { ok: true as const, session: latestSession, exportArtifact: latestSession.exportArtifact };
      }

      await enforceWindowLimits([
        { key: visitorDailyWindow.key, field: "exports", limit: dailyLimit, ttlSeconds: visitorDailyWindow.ttlSeconds },
        { key: ipDailyWindow.key, field: "exports", limit: dailyLimit * 3, ttlSeconds: ipDailyWindow.ttlSeconds },
        { key: burstKey("exports:v", visitor.visitorId), limit: 2, ttlSeconds: burstWindowTtlSeconds() },
        { key: burstKey("exports:i", ipHash), limit: 6, ttlSeconds: burstWindowTtlSeconds() },
      ]);

      const reservation = await reserveAnonymousAiUsage(visitor.visitorId, "export");

      if (!reservation.allowed) {
        throw new RateLimitError("Anonymous export quota reached. Sign in or wait for the cooldown before trying again.");
      }

      try {
        const exportArtifact = await createArchitectExport(latestSession);
        await saveSessionExport(latestSession, exportArtifact);
        return { ok: true as const, session: latestSession, exportArtifact };
      } catch (error) {
        if (!isProviderChargeUnclear(error)) {
          await releaseAnonymousAiUsage(reservation);
        }

        logServerError("anonymous-session:export:generate", error, { sessionId, visitorId: visitor.visitorId, regenerate });
        const publicError = toPublicInfrastructureError(error, {
          message: "Precode export failed.",
          status: 502,
        });
        return { ok: false as const, status: publicError.status, error: publicError.message };
      }
    });

    if (!exportSession.ok) {
      return applyVisitorCookie(NextResponse.json({ error: exportSession.error }, { status: exportSession.status }), visitor);
    }

    return applyVisitorCookie(
      NextResponse.json({
        session: serializeSession(exportSession.session),
        exportArtifact: exportSession.exportArtifact,
      }),
      visitor,
    );
  } catch (error) {
    if (error instanceof AbuseControlConfigError || error instanceof Error) {
      logServerError("anonymous-session:export", error, { sessionId, regenerate });
    }

    const publicError = toPublicInfrastructureError(error, {
      message: "Anonymous usage controls are temporarily unavailable.",
      status: 503,
    });

    return Response.json({ error: publicError.message }, { status: publicError.status });
  }
}
