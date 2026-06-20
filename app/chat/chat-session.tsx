"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Composer } from "../components/composer";
import { ArchitectIcon } from "../components/icons";
import { ProfileBadge, WorkflowSidebar } from "../components/workflow-sidebar";
import {
  type ClientAnonymousSession,
  type ClientSessionMessage,
  getAnonymousSession,
  getStoredAnonymousSessionId,
  sendAnonymousMessage,
} from "../lib/anonymous-session-client";

const fallbackCaptured = ["AI workflow", "Full-stack web apps", "Coding agents"];

function getCapturedTags(session: ClientAnonymousSession | null) {
  const firstUserMessage = session?.messages.find((message) => message.role === "user")?.content.toLowerCase() ?? "";
  const tags = new Set<string>();

  if (firstUserMessage.includes("ai")) tags.add("AI workflow");
  if (firstUserMessage.includes("founder")) tags.add("Founders");
  if (firstUserMessage.includes("agent") || firstUserMessage.includes("claude") || firstUserMessage.includes("cursor") || firstUserMessage.includes("codex")) {
    tags.add("Coding agents");
  }
  if (firstUserMessage.includes("app") || firstUserMessage.includes("web")) tags.add("Full-stack web apps");

  return tags.size ? Array.from(tags) : fallbackCaptured;
}

function messageLabel(message: ClientSessionMessage) {
  return message.role === "user" ? "You" : "Architect Mode";
}

export function ChatSession() {
  const [session, setSession] = useState<ClientAnonymousSession | null>(null);
  const [status, setStatus] = useState("Loading session...");
  const [isSending, setIsSending] = useState(false);

  const captured = useMemo(() => getCapturedTags(session), [session]);
  const usedMessages = session ? session.maxMessages - session.remainingMessages : 0;

  useEffect(() => {
    async function loadSession() {
      const sessionId = getStoredAnonymousSessionId();

      if (!sessionId) {
        setStatus("No anonymous session found. Start with one product idea from the workspace.");
        return;
      }

      try {
        const loadedSession = await getAnonymousSession(sessionId);

        if (!loadedSession) {
          setStatus("This anonymous session expired. Start again from the workspace.");
          return;
        }

        setSession(loadedSession);
        setStatus("");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load session.");
      }
    }

    void loadSession();
  }, []);

  async function handleSend(content: string) {
    if (!session) return;

    setIsSending(true);
    setStatus("Architect Mode is reading...");

    try {
      const payload = await sendAnonymousMessage(session.id, content);
      setSession(payload.session);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#12131a] text-[#e2e1eb]">
      <WorkflowSidebar projectMeta="Anonymous trial" projectTitle="New product" />

      <section className="flex h-screen flex-col lg:ml-[280px] lg:mr-[340px]">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#2a2d37] bg-[#12131a]/85 px-5 backdrop-blur-md lg:px-10">
          <div>
            <p className="text-sm font-medium text-[#f7f7fa]">Anonymous product session</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">
              {session ? `${session.remainingMessages} trial messages left` : "Chat session"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-[3px] bg-[#1e2230] px-4 py-2 font-mono text-xs tracking-[0.1em] text-[#d8e2ff] transition hover:bg-[#282f43]">
              Save Draft
            </button>
            <ProfileBadge />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-8 lg:px-12">
          <div className="mx-auto max-w-[860px] space-y-8">
            {status && !session ? (
              <div className="rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-5">
                <p className="text-sm leading-6 text-[#c2c6d6]">{status}</p>
                <Link className="mt-4 inline-block rounded-[3px] bg-[#adc6ff] px-4 py-2 font-mono text-xs text-[#002e6a]" href="/home">
                  Start from workspace
                </Link>
              </div>
            ) : null}

            {session?.messages.map((message) => (
              <article className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
                {message.role === "assistant" ? (
                  <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-[#424754] bg-[#1e1f26]">
                    <ArchitectIcon className="h-4 w-4 text-[#adc6ff]" name="spark" />
                  </div>
                ) : null}
                <div className={`max-w-[720px] ${message.role === "user" ? "rounded-[6px] border border-[#424754] bg-[#1a1b22] p-5" : ""}`}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">{messageLabel(message)}</p>
                  <p className={`mt-3 text-base leading-7 ${message.role === "user" ? "text-[#e2e1eb]" : "text-[#c2c6d6]"}`}>{message.content}</p>
                </div>
              </article>
            ))}

            {session && session.messages.length > 0 ? (
              <>
                <article className="flex gap-4">
                  <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-[#424754] bg-[#1e1f26]">
                    <ArchitectIcon className="h-4 w-4 text-[#adc6ff]" name="layers" />
                  </div>
                  <div className="w-full max-w-[760px]">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Structured read</p>
                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-1 rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-4 sm:grid-cols-[150px_1fr]">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">Session type</p>
                        <p className="text-sm leading-6 text-[#e2e1eb]">Anonymous trial product</p>
                      </div>
                      <div className="grid gap-1 rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-4 sm:grid-cols-[150px_1fr]">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">Current stage</p>
                        <p className="text-sm leading-6 text-[#e2e1eb]">Idea clarification before architecture</p>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="flex gap-4">
                  <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-[#424754] bg-[#1e1f26]">
                    <ArchitectIcon className="h-4 w-4 text-[#adc6ff]" name="note" />
                  </div>
                  <div className="w-full max-w-[760px] rounded-[4px] border border-[#33343c] bg-[#1a1b22] p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Architect note</p>
                    <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">
                      This is currently a mock AI response path. The session, validation, anonymous limit, and message flow are connected end to end.
                    </p>
                  </div>
                </article>
              </>
            ) : null}

            {status && session ? <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">{status}</p> : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-[#2a2d37] bg-[#12131a] px-5 py-4 lg:px-12">
          <Composer
            className="mx-auto max-w-[860px]"
            context={session ? `Context: ${session.remainingMessages} trial messages left` : "Context: Idea session"}
            disabled={!session || isSending || session.remainingMessages <= 0}
            onSubmit={handleSend}
            placeholder={session?.remainingMessages === 0 ? "Anonymous trial limit reached." : "Reply with details, paste notes, or ask what to decide next..."}
          />
        </div>
      </section>

      <aside className="fixed right-0 top-0 hidden h-screen w-[340px] border-l border-[#2a2d37] bg-[#12131a] px-7 py-8 lg:block">
        <h2 className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-[#e2e1eb]/80">Session Data</h2>

        <div className="mt-8 space-y-8">
          <section>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Captured context</h3>
            <div className="flex flex-wrap gap-2">
              {captured.map((tag) => (
                <span className="rounded-[3px] border border-[#424754] bg-[#282a31] px-2.5 py-1.5 font-mono text-[11px] text-[#e2e1eb]" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Anonymous trial</h3>
            <div className="divide-y divide-[#2a2d37] rounded-[4px] border border-[#33343c] bg-[#0c0e14]">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-[#c2c6d6]">Messages used</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#adc6ff]">
                  {session ? `${usedMessages}/${session.maxMessages}` : "0/6"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-[#c2c6d6]">Project limit</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#adc6ff]">1 product</span>
              </div>
            </div>
          </section>

          <section className="rounded-[3px] border border-[#33343c] bg-[#1a1b22] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ArchitectIcon className="h-4 w-4 text-[#adc6ff]" name="warning" />
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e2e1eb]">Mock backend</h3>
            </div>
            <p className="text-sm leading-6 text-[#c2c6d6]">Anonymous session storage is currently in memory. Database schema and LLM calls come after the UI flow feels right.</p>
          </section>
        </div>
      </aside>
    </main>
  );
}
