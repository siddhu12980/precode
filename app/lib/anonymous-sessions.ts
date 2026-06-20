export type SessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type AnonymousSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  maxMessages: number;
  messages: SessionMessage[];
};

type SessionStore = Map<string, AnonymousSession>;

const globalForSessions = globalThis as typeof globalThis & {
  architectModeAnonymousSessions?: SessionStore;
};

const sessions = globalForSessions.architectModeAnonymousSessions ?? new Map<string, AnonymousSession>();

globalForSessions.architectModeAnonymousSessions = sessions;

export const ANONYMOUS_MESSAGE_LIMIT = 6;

type GenerateAssistantReply = (input: {
  content: string;
  turn: number;
  previousMessages: SessionMessage[];
}) => Promise<string> | string;

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

export function createAnonymousSession() {
  const timestamp = now();
  const session: AnonymousSession = {
    id: createId("anon"),
    createdAt: timestamp,
    updatedAt: timestamp,
    maxMessages: ANONYMOUS_MESSAGE_LIMIT,
    messages: [],
  };

  sessions.set(session.id, session);
  return session;
}

export function getAnonymousSession(sessionId: string) {
  return sessions.get(sessionId) ?? null;
}

export async function addUserMessage(sessionId: string, content: string, generateAssistantReply: GenerateAssistantReply = createMockArchitectReply) {
  const session = getAnonymousSession(sessionId);

  if (!session) {
    return { ok: false as const, status: 404, error: "Session not found." };
  }

  const usedMessages = session.messages.filter((message) => message.role === "user").length;

  if (usedMessages >= session.maxMessages) {
    return { ok: false as const, status: 403, error: "Anonymous message limit reached." };
  }

  const cleanContent = content.trim();

  if (!cleanContent) {
    return { ok: false as const, status: 400, error: "Message content is required." };
  }

  const userMessage: SessionMessage = {
    id: createId("msg"),
    role: "user",
    content: cleanContent,
    createdAt: now(),
  };

  const assistantContent = await generateAssistantReply({
    content: cleanContent,
    turn: usedMessages + 1,
    previousMessages: session.messages,
  });

  const assistantMessage: SessionMessage = {
    id: createId("msg"),
    role: "assistant",
    content: assistantContent,
    createdAt: now(),
  };

  session.messages.push(userMessage, assistantMessage);
  session.updatedAt = now();

  return { ok: true as const, session, userMessage, assistantMessage };
}

export function serializeSession(session: AnonymousSession) {
  const usedMessages = session.messages.filter((message) => message.role === "user").length;

  return {
    ...session,
    remainingMessages: Math.max(session.maxMessages - usedMessages, 0),
  };
}

export function createMockArchitectReply({ content, turn }: { content: string; turn: number; previousMessages?: SessionMessage[] }) {
  if (turn === 1) {
    return `I have started an anonymous planning session. I read your idea as: "${content}". Before architecture, I need to clarify the first user and the smallest useful version.`;
  }

  if (turn === 2) {
    return "Good. I am capturing that as product context. Next I would check roles, sensitive data, and the main action a user must complete in the MVP.";
  }

  return "Captured. For now this is a mock architect response, but the session validation and message flow are working. The next backend step is replacing this with the interview engine and LLM call.";
}
