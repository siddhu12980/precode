import { getAnonymousSession, serializeSession } from "@/app/lib/anonymous-sessions";

export async function GET(_request: Request, context: RouteContext<"/api/anonymous-sessions/[sessionId]">) {
  const { sessionId } = await context.params;
  const session = getAnonymousSession(sessionId);

  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  return Response.json({
    session: serializeSession(session),
  });
}
