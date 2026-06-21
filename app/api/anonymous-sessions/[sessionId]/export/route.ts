import { createArchitectExport } from "@/app/lib/architect-export";
import { canExportSession, getAnonymousSession, saveSessionExport, serializeSession } from "@/app/lib/anonymous-sessions";

export async function POST(_request: Request, context: RouteContext<"/api/anonymous-sessions/[sessionId]/export">) {
  const { sessionId } = await context.params;
  const session = getAnonymousSession(sessionId);

  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  if (!canExportSession(session)) {
    return Response.json({ error: "This session is not ready for export yet." }, { status: 409 });
  }

  if (!session.exportArtifact) {
    const exportArtifact = await createArchitectExport(session).catch((error) => {
      console.error("Architect Mode export failed", error);
      return {
        error: error instanceof Error ? error.message : "Architect Mode export failed.",
      };
    });

    if ("error" in exportArtifact) {
      return Response.json({ error: exportArtifact.error }, { status: 502 });
    }

    saveSessionExport(session, exportArtifact);
  }

  return Response.json({
    session: serializeSession(session),
    exportArtifact: session.exportArtifact,
  });
}
