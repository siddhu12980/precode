import { addUserMessage, serializeSession } from "@/app/lib/anonymous-sessions";
import { createTemporaryGroqArchitectReply } from "@/app/lib/groq-architect";

export async function POST(request: Request, context: RouteContext<"/api/anonymous-sessions/[sessionId]/messages">) {
  const { sessionId } = await context.params;
  const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
  const content = typeof body?.content === "string" ? body.content : "";
  const result = await addUserMessage(sessionId, content, createTemporaryGroqArchitectReply);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    session: serializeSession(result.session),
    userMessage: result.userMessage,
    assistantMessage: result.assistantMessage,
  });
}
