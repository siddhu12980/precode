import type { ArchitectExportArtifact, ArchitectResponseMetadata } from "./architect-progress";

export type ClientSessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata?: ArchitectResponseMetadata;
};

export type ClientAnonymousSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  maxMessages: number;
  remainingMessages: number;
  status: "draft" | "export_ready";
  exportArtifact?: ArchitectExportArtifact;
  messages: ClientSessionMessage[];
};

const SESSION_STORAGE_KEY = "architect-mode-anonymous-session-id";

export function getStoredAnonymousSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

export function storeAnonymousSessionId(sessionId: string) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

export function clearStoredAnonymousSessionId() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function createAnonymousSession() {
  const response = await fetch("/api/anonymous-sessions", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to create anonymous session.");
  }

  const payload = (await response.json()) as { session: ClientAnonymousSession };
  storeAnonymousSessionId(payload.session.id);
  return payload.session;
}

export async function getAnonymousSession(sessionId: string) {
  const response = await fetch(`/api/anonymous-sessions/${sessionId}`);

  if (response.status === 404) {
    clearStoredAnonymousSessionId();
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load anonymous session.");
  }

  const payload = (await response.json()) as { session: ClientAnonymousSession };
  return payload.session;
}

export async function sendAnonymousMessage(sessionId: string, content: string) {
  const response = await fetch(`/api/anonymous-sessions/${sessionId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        session: ClientAnonymousSession;
        userMessage: ClientSessionMessage;
        assistantMessage: ClientSessionMessage;
        error?: never;
      }
    | { error: string }
    | null;

  if (!response.ok) {
    throw new Error(payload && "error" in payload ? payload.error : "Unable to send message.");
  }

  if (!payload || "error" in payload) {
    throw new Error("Unexpected response from message endpoint.");
  }

  return payload;
}

export async function startAnonymousSession(content: string) {
  const response = await fetch("/api/anonymous-sessions/bootstrap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        session: ClientAnonymousSession;
        userMessage: ClientSessionMessage;
        assistantMessage: ClientSessionMessage;
        error?: never;
      }
    | { error: string }
    | null;

  if (!response.ok) {
    throw new Error(payload && "error" in payload ? payload.error : "Unable to start session.");
  }

  if (!payload || "error" in payload) {
    throw new Error("Unexpected response from session bootstrap endpoint.");
  }

  storeAnonymousSessionId(payload.session.id);
  return payload;
}

export async function generateAnonymousSessionExport(sessionId: string, options?: { regenerate?: boolean }) {
  const searchParams = new URLSearchParams();

  if (options?.regenerate) {
    searchParams.set("regenerate", "1");
  }

  const response = await fetch(`/api/anonymous-sessions/${sessionId}/export${searchParams.size ? `?${searchParams.toString()}` : ""}`, {
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        session: ClientAnonymousSession;
        exportArtifact: ArchitectExportArtifact;
        error?: never;
      }
    | { error: string }
    | null;

  if (!response.ok) {
    throw new Error(payload && "error" in payload ? payload.error : "Unable to generate export.");
  }

  if (!payload || "error" in payload) {
    throw new Error("Unexpected response from export endpoint.");
  }

  return payload;
}
