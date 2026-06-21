"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Composer } from "../components/composer";
import {
  createAnonymousSession,
  getAnonymousSession,
  getStoredAnonymousSessionId,
  storePendingInitialMessage,
} from "../lib/anonymous-session-client";

export function SessionStarter() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function getOrCreateSessionId() {
    const storedSessionId = getStoredAnonymousSessionId();

    if (storedSessionId) {
      const existingSession = await getAnonymousSession(storedSessionId);

      if (existingSession) {
        return existingSession.id;
      }
    }

    const session = await createAnonymousSession();
    return session.id;
  }

  async function handleStart(message: string) {
    setIsSubmitting(true);
    setStatus("Starting anonymous session...");

    try {
      const sessionId = await getOrCreateSessionId();
      storePendingInitialMessage(sessionId, message);
      setStatus("Opening chat...");
      router.push("/chat");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong starting the session.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <Composer
        actionLabel={isSubmitting ? "Starting" : "Start"}
        context="Context: New product"
        disabled={isSubmitting}
        onSubmit={handleStart}
        placeholder="Tell Architect Mode what you want to build..."
      />
      {status ? <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">{status}</p> : null}
    </div>
  );
}
