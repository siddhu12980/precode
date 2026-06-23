import { getAnonymousSession, serializeSession } from "@/app/lib/anonymous-sessions";
import { applyVisitorCookie, getOrCreateAnonymousVisitor, visitorOwnsAnonymousSession } from "@/app/lib/anonymous-abuse-controls";
import { NextResponse } from "next/server";

export async function GET(request: Request, context: RouteContext<"/api/anonymous-sessions/[sessionId]">) {
  const { sessionId } = await context.params;
  const visitor = await getOrCreateAnonymousVisitor(request);

  if (!(await visitorOwnsAnonymousSession(visitor.visitorId, sessionId))) {
    return applyVisitorCookie(NextResponse.json({ error: "Session not found." }, { status: 404 }), visitor);
  }

  const session = await getAnonymousSession(sessionId);

  if (!session) {
    return applyVisitorCookie(NextResponse.json({ error: "Session not found." }, { status: 404 }), visitor);
  }

  return applyVisitorCookie(
    NextResponse.json({
      session: serializeSession(session),
    }),
    visitor,
  );
}
