export type ClientSessionMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ClientAnonymousSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  maxMessages: number;
  remainingMessages: number;
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
