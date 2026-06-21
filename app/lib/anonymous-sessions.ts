import prisma from "../../lib/prisma";
import type { ArchitectAssistantResponse, ArchitectExportArtifact, ArchitectResponseMetadata } from "./architect-progress";

export type SessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata?: ArchitectResponseMetadata;
};

export type AnonymousSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  maxMessages: number;
  status: "draft" | "export_ready";
  exportArtifact?: ArchitectExportArtifact;
  messages: SessionMessage[];
};

type DbSessionWithMessages = Awaited<ReturnType<typeof fetchSession>>;

export const ANONYMOUS_MESSAGE_LIMIT = 10;

type GenerateAssistantReply = (input: {
  content: string;
  turn: number;
  previousMessages: SessionMessage[];
}) => Promise<ArchitectAssistantResponse> | ArchitectAssistantResponse;

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function asSessionStatus(value: string): AnonymousSession["status"] {
  return value === "export_ready" ? "export_ready" : "draft";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asMetadata(value: unknown): ArchitectResponseMetadata | undefined {
  return isRecord(value) ? (value as ArchitectResponseMetadata) : undefined;
}

function asExportArtifact(value: unknown): ArchitectExportArtifact | undefined {
  return isRecord(value) ? (value as ArchitectExportArtifact) : undefined;
}

function serializeDate(value: Date) {
  return value.toISOString();
}

async function fetchSession(sessionId: string) {
  return prisma.anonymousSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

function mapSession(session: NonNullable<DbSessionWithMessages>): AnonymousSession {
  return {
    id: session.id,
    createdAt: serializeDate(session.createdAt),
    updatedAt: serializeDate(session.updatedAt),
    maxMessages: session.maxMessages,
    status: asSessionStatus(session.status),
    exportArtifact: asExportArtifact(session.exportArtifact),
    messages: session.messages.map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
      createdAt: serializeDate(message.createdAt),
      metadata: asMetadata(message.metadata),
    })),
  };
}

export async function createAnonymousSession() {
  const session = await prisma.anonymousSession.create({
    data: {
      id: createId("anon"),
      maxMessages: ANONYMOUS_MESSAGE_LIMIT,
      status: "draft",
    },
    include: {
      messages: true,
    },
  });

  return mapSession(session);
}

export async function getAnonymousSession(sessionId: string) {
  const session = await fetchSession(sessionId);
  return session ? mapSession(session) : null;
}

export async function addUserMessage(sessionId: string, content: string, generateAssistantReply: GenerateAssistantReply) {
  const session = await getAnonymousSession(sessionId);

  if (!session) {
    return { ok: false as const, status: 404, error: "Session not found." };
  }

  if (session.status === "export_ready") {
    return { ok: false as const, status: 409, error: "This project is complete. Open the export screen to copy or download the final plan." };
  }

  const usedMessages = session.messages.filter((message) => message.role === "user").length;

  if (usedMessages >= session.maxMessages) {
    return { ok: false as const, status: 403, error: "Anonymous message limit reached." };
  }

  const cleanContent = content.trim();

  if (!cleanContent) {
    return { ok: false as const, status: 400, error: "Message content is required." };
  }

  const assistantReply = await generateAssistantReply({
    content: cleanContent,
    turn: usedMessages + 1,
    previousMessages: session.messages,
  });

  const nextStatus = assistantReply.metadata.interactionMode === "export_ready" ? "export_ready" : session.status;
  const userMessageId = createId("msg");
  const assistantMessageId = createId("msg");

  await prisma.$transaction([
    prisma.sessionMessage.create({
      data: {
        id: userMessageId,
        role: "user",
        content: cleanContent,
        sessionId,
      },
    }),
    prisma.sessionMessage.create({
      data: {
        id: assistantMessageId,
        role: "assistant",
        content: assistantReply.content,
        metadata: assistantReply.metadata,
        sessionId,
      },
    }),
    prisma.anonymousSession.update({
      where: { id: sessionId },
      data: { status: nextStatus },
    }),
  ]);

  const updatedSession = await getAnonymousSession(sessionId);

  if (!updatedSession) {
    return { ok: false as const, status: 404, error: "Session not found." };
  }

  const userMessage = updatedSession.messages.find((message) => message.id === userMessageId);
  const assistantMessage = updatedSession.messages.find((message) => message.id === assistantMessageId);

  if (!userMessage || !assistantMessage) {
    return { ok: false as const, status: 500, error: "Unable to save session messages." };
  }

  return { ok: true as const, session: updatedSession, userMessage, assistantMessage };
}

export function serializeSession(session: AnonymousSession) {
  const usedMessages = session.messages.filter((message) => message.role === "user").length;
  const status = canExportSession(session) ? "export_ready" : session.status;

  return {
    ...session,
    status,
    remainingMessages: Math.max(session.maxMessages - usedMessages, 0),
  };
}

export function latestAssistantMetadata(session: AnonymousSession) {
  return session.messages
    .slice()
    .reverse()
    .find((message) => message.role === "assistant" && message.metadata)?.metadata;
}

export function canExportSession(session: AnonymousSession) {
  return session.status === "export_ready" || latestAssistantMetadata(session)?.interactionMode === "export_ready";
}

export async function saveSessionExport(session: AnonymousSession, exportArtifact: ArchitectExportArtifact) {
  await prisma.anonymousSession.update({
    where: { id: session.id },
    data: {
      status: "export_ready",
      exportArtifact,
    },
  });

  session.exportArtifact = exportArtifact;
  session.status = "export_ready";
  session.updatedAt = new Date().toISOString();
  return session.exportArtifact;
}
