import { createArchitectExport } from "@/app/lib/architect-export";
import { canExportSession, getAnonymousSession, saveSessionExport, serializeSession } from "@/app/lib/anonymous-sessions";
import {
  AbuseControlConfigError,
  RateLimitError,
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
  withRedisLock,
} from "@/app/lib/anonymous-abuse-controls";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/anonymous-sessions/[sessionId]/export">) {
  const { sessionId } = await context.params;
  const session = await getAnonymousSession(sessionId);

  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  if (!canExportSession(session)) {
    return Response.json({ error: "This session is not ready for export yet." }, { status: 409 });
  }

  if (session.exportArtifact) {
    return Response.json({
      session: serializeSession(session),
      exportArtifact: session.exportArtifact,
    });
  }

  try {
    const visitor = await getOrCreateAnonymousVisitor(request);
    const ipHash = hashRequestIdentity(request);
    const dailyLimit = envInt("ANON_DAILY_EXPORT_LIMIT", 2);

    await enforceWindowLimits([
      { key: dailyKey("exports:visitor", visitor.visitorId), limit: dailyLimit, ttlSeconds: 24 * 60 * 60 },
      { key: dailyKey("exports:ip", ipHash), limit: dailyLimit * 3, ttlSeconds: 24 * 60 * 60 },
      { key: burstKey("exports:visitor", visitor.visitorId), limit: 2, ttlSeconds: 60 },
      { key: burstKey("exports:ip", ipHash), limit: 6, ttlSeconds: 60 },
      { key: sessionKey("exports", sessionId), limit: 1, ttlSeconds: 24 * 60 * 60 },
    ]);

    const exportSession = await withRedisLock(sessionKey("lock:export", sessionId), 90, async () => {
      const latestSession = await getAnonymousSession(sessionId);

      if (!latestSession) {
        return { ok: false as const, status: 404, error: "Session not found." };
      }

      if (!canExportSession(latestSession)) {
        return { ok: false as const, status: 409, error: "This session is not ready for export yet." };
      }

      if (latestSession.exportArtifact) {
        return { ok: true as const, session: latestSession, exportArtifact: latestSession.exportArtifact };
      }

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
          await releaseAnonymousAiUsage(visitor.visitorId, "export");
        }

        console.error("Architect Mode export failed", error);
        return { ok: false as const, status: 502, error: "Architect Mode export failed." };
      }
    });

    if (!exportSession.ok) {
      return Response.json({ error: exportSession.error }, { status: exportSession.status });
    }

    return Response.json({
      session: serializeSession(exportSession.session),
      exportArtifact: exportSession.exportArtifact,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429 });
    }

    if (error instanceof AbuseControlConfigError || error instanceof Error) {
      console.error("Anonymous export controls failed", error);
    }

    return Response.json({ error: "Anonymous usage controls are temporarily unavailable." }, { status: 503 });
  }
}
