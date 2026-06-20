import { createAnonymousSession, serializeSession } from "@/app/lib/anonymous-sessions";

export async function POST() {
  const session = createAnonymousSession();

  return Response.json({
    session: serializeSession(session),
  });
}
