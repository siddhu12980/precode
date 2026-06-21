"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Composer } from "../components/composer";
import { ArchitectIcon, type IconName } from "../components/icons";
import { ProfileBadge, WorkflowSidebar, type WorkflowStep } from "../components/workflow-sidebar";
import {
  type ClientAnonymousSession,
  type ClientSessionMessage,
  getAnonymousSession,
  getStoredAnonymousSessionId,
  sendAnonymousMessage,
  takePendingInitialMessage,
} from "../lib/anonymous-session-client";
import { ARCHITECT_STEPS, STEP_LABELS, createFallbackMetadata, type ArchitectResponseMetadata, type ArchitectStep } from "../lib/architect-progress";

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

function normalizeAssistantText(content: string) {
  return content
    .replace(/\s+-\s+\*\*/g, "\n- **")
    .replace(/\s+-\s+/g, "\n- ")
    .replace(/\s+(\d+\.)\s+/g, "\n$1 ");
}

function renderInlineText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong className="font-medium text-[#f7f7fa]" key={`${part}-${index}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function AssistantMessageText({ content }: { content: string }) {
  const lines = normalizeAssistantText(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const listItems = lines.filter((line) => /^(-|\d+\.)\s+/.test(line));
  const paragraphs = lines.filter((line) => !/^(-|\d+\.)\s+/.test(line));

  return (
    <div className="mt-3 space-y-3 text-base leading-7 text-[#c2c6d6]">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{renderInlineText(paragraph)}</p>
      ))}
      {listItems.length ? (
        <ul className="space-y-2">
          {listItems.map((item) => (
            <li className="flex gap-3" key={item}>
              <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-[#adc6ff]" />
              <span>{renderInlineText(item.replace(/^(-|\d+\.)\s+/, ""))}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const stepIcons: Record<ArchitectStep, IconName> = {
  idea: "idea",
  users: "users",
  features: "features",
  risks: "risks",
  architecture: "architecture",
  export: "export",
};

function getLatestMetadata(session: ClientAnonymousSession | null): ArchitectResponseMetadata {
  const latestAssistantMessage = session?.messages
    .slice()
    .reverse()
    .find((message) => message.role === "assistant" && message.metadata);

  return latestAssistantMessage?.metadata ?? createFallbackMetadata();
}

function getWorkflowSteps(currentStep: ArchitectStep): WorkflowStep[] {
  const currentIndex = ARCHITECT_STEPS.indexOf(currentStep);

  return ARCHITECT_STEPS.map((step) => ({
    label: STEP_LABELS[step],
    icon: stepIcons[step],
    active: step === currentStep,
    completed: ARCHITECT_STEPS.indexOf(step) < currentIndex,
    gap: step === "export",
  }));
}

function getAssistantActionLabel(metadata: ArchitectResponseMetadata) {
  if (metadata.interactionMode === "confirm_architecture") {
    return "Architecture review";
  }

  if (metadata.interactionMode === "export_ready") {
    return "Final plan";
  }

  return "Suggested assumptions";
}

export function ChatSession() {
  const router = useRouter();
  const [session, setSession] = useState<ClientAnonymousSession | null>(null);
  const [status, setStatus] = useState("Loading session...");
  const [isSending, setIsSending] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);

  const metadata = useMemo(() => getLatestMetadata(session), [session]);
  const captured = useMemo(() => {
    if (metadata.capturedContext.length) {
      return metadata.capturedContext;
    }

    return getCapturedTags(session);
  }, [metadata.capturedContext, session]);
  const workflowSteps = useMemo(() => getWorkflowSteps(metadata.step), [metadata.step]);
  const missingDecisions = metadata.missingDecisions.length ? metadata.missingDecisions : ["Primary users", "MVP scope", "Risk constraints"];
  const usedMessages = session ? session.maxMessages - session.remainingMessages : 0;
  const isExportReady = session?.status === "export_ready" || metadata.interactionMode === "export_ready";

  const sendMessage = useCallback(
    async (activeSession: ClientAnonymousSession, content: string) => {
      const previousSession = activeSession;
      const optimisticMessage: ClientSessionMessage = {
        id: `optimistic_${activeSession.id}_${activeSession.messages.length}`,
        role: "user",
        content,
        createdAt: activeSession.updatedAt,
      };

      setIsSending(true);
      setStatus("Architect Mode is reading...");
      setSession((currentSession) => {
        const sessionToUpdate = currentSession?.id === activeSession.id ? currentSession : activeSession;

        return {
          ...sessionToUpdate,
          messages: [...sessionToUpdate.messages, optimisticMessage],
          remainingMessages: Math.max(sessionToUpdate.remainingMessages - 1, 0),
        };
      });

      try {
        const payload = await sendAnonymousMessage(activeSession.id, content);
        setSession(payload.session);
        setStatus("");
        if (payload.session.status === "export_ready" || payload.assistantMessage.metadata?.interactionMode === "export_ready") {
          router.push("/export");
        }
      } catch (error) {
        setSession(previousSession);
        setStatus(error instanceof Error ? error.message : "Unable to send message.");
      } finally {
        setIsSending(false);
      }
    },
    [router],
  );

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

        const pendingInitialMessage = takePendingInitialMessage(loadedSession.id);

        if (pendingInitialMessage && loadedSession.status !== "export_ready") {
          void sendMessage(loadedSession, pendingInitialMessage);
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load session.");
      }
    }

    void loadSession();
  }, [sendMessage]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [session?.messages.length, status]);

  async function handleSend(content: string) {
    if (!session) return;

    await sendMessage(session, content);
  }

  function addSuggestionToDraft(suggestion: string) {
    setDraftMessage((currentDraft) => {
      if (!currentDraft.trim()) {
        return suggestion;
      }

      if (currentDraft.includes(suggestion)) {
        return currentDraft;
      }

      return `${currentDraft.trim()}\n${suggestion}`;
    });
  }

  function continueWithArchitecture() {
    void handleSend("Continue with this architecture and prepare the export plan.");
  }

  function requestArchitectureChange() {
    setDraftMessage("I want to change a major architecture component: ");
  }

  return (
    <main className="h-screen overflow-hidden bg-[#12131a] text-[#e2e1eb]">
      <WorkflowSidebar projectMeta="Anonymous trial" projectTitle="New product" steps={workflowSteps} />

      <section className="flex h-screen flex-col lg:ml-[280px] lg:mr-[340px]">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#2a2d37] bg-[#12131a]/85 px-5 backdrop-blur-md lg:px-10">
          <div>
            <p className="text-sm font-medium text-[#f7f7fa]">Anonymous product session</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">
              {isExportReady ? "Project complete" : session ? `${session.remainingMessages} trial messages left` : "Chat session"}
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
                  {message.role === "assistant" ? (
                    <>
                      <AssistantMessageText content={message.content} />
                      {message.metadata?.suggestedDefaults?.length ? (
                        <div className="mt-5 space-y-2">
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">{getAssistantActionLabel(message.metadata)}</p>
                          {message.metadata.interactionMode === "confirm_architecture" ? (
                            <>
                              <div className="space-y-2">
                                {message.metadata.suggestedDefaults.map((suggestion) => (
                                  <div className="flex items-start gap-3 rounded-[4px] border border-[#33343c] bg-[#1a1b22] px-4 py-3 text-sm leading-5 text-[#d8e2ff]" key={suggestion}>
                                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#adc6ff] bg-[#202331] text-[#adc6ff]">
                                      <ArchitectIcon className="h-3 w-3" name="check" />
                                    </span>
                                    <span>{suggestion}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                                <button
                                  className="flex items-center justify-center gap-2 rounded-[3px] bg-[#adc6ff] px-4 py-3 font-mono text-xs font-medium tracking-[0.08em] text-[#002e6a] transition hover:bg-[#d8e2ff] disabled:cursor-not-allowed disabled:opacity-50"
                                  disabled={!session || isSending || session.remainingMessages <= 0 || isExportReady}
                                  onClick={continueWithArchitecture}
                                  type="button"
                                >
                                  <ArchitectIcon className="h-4 w-4" name="check" />
                                  Continue
                                </button>
                                <button
                                  className="flex items-center justify-center gap-2 rounded-[3px] border border-[#424754] bg-[#0c0e14] px-4 py-3 font-mono text-xs font-medium tracking-[0.08em] text-[#d8e2ff] transition hover:border-[#adc6ff] hover:text-[#adc6ff] disabled:cursor-not-allowed disabled:opacity-50"
                                  disabled={!session || isSending || session.remainingMessages <= 0 || isExportReady}
                                  onClick={requestArchitectureChange}
                                  type="button"
                                >
                                  <ArchitectIcon className="h-4 w-4" name="architecture" />
                                  Change component
                                </button>
                              </div>
                            </>
                          ) : (
                            message.metadata.suggestedDefaults.map((suggestion) => {
                              const selected = draftMessage.includes(suggestion);

                              return (
                                <button
                                  className={`group relative block w-full overflow-hidden rounded-[4px] border px-4 py-3 text-left text-sm leading-5 transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                                    selected
                                      ? "border-[#adc6ff] bg-[#202331] text-[#f7f7fa] shadow-[0_0_0_1px_rgba(173,198,255,0.16),0_18px_40px_-30px_rgba(173,198,255,0.9)]"
                                      : "border-[#33343c] bg-[#1a1b22] text-[#d8e2ff] hover:-translate-y-0.5 hover:border-[#adc6ff] hover:bg-[#202331] hover:shadow-[0_16px_35px_-30px_rgba(173,198,255,0.9)]"
                                  }`}
                                  disabled={!session || isSending || session.remainingMessages <= 0 || isExportReady}
                                  key={suggestion}
                                  onClick={() => addSuggestionToDraft(suggestion)}
                                  type="button"
                                >
                                  <span
                                    className={`absolute bottom-0 left-0 top-0 w-1 transition ${
                                      selected ? "bg-[#adc6ff] shadow-[0_0_16px_2px_rgba(173,198,255,0.55)]" : "bg-transparent group-hover:bg-[#adc6ff]/50"
                                    }`}
                                  />
                                  <span className="flex items-center justify-between gap-4">
                                    <span>{suggestion}</span>
                                    <span
                                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                                        selected ? "border-[#adc6ff] bg-[#adc6ff] text-[#002e6a]" : "border-[#424754] text-[#8c909f] group-hover:border-[#adc6ff] group-hover:text-[#adc6ff]"
                                      }`}
                                    >
                                      <ArchitectIcon className="h-3.5 w-3.5" name={selected ? "check" : "spark"} />
                                    </span>
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-3 text-base leading-7 text-[#e2e1eb]">{message.content}</p>
                  )}
                </div>
              </article>
            ))}

            {isExportReady ? (
              <div className="rounded-[4px] border border-[#424754] bg-[#0c0e14] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#adc6ff]">Export ready</p>
                <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">
                  This project is complete for the current version. The chat is read-only now; open the export package to copy or download the PRD and architecture plan.
                </p>
                <Link className="mt-4 inline-flex items-center gap-2 rounded-[3px] bg-[#adc6ff] px-4 py-2 font-mono text-xs font-medium tracking-[0.08em] text-[#002e6a] transition hover:bg-[#d8e2ff]" href="/export">
                  <ArchitectIcon className="h-4 w-4" name="export" />
                  View export
                </Link>
              </div>
            ) : null}

            {status && session ? <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">{status}</p> : null}
            <div ref={messageEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-[#2a2d37] bg-[#12131a] px-5 py-4 lg:px-12">
          <Composer
            className="mx-auto max-w-[860px]"
            context={session ? `Context: ${session.remainingMessages} trial messages left` : "Context: Idea session"}
            disabled={!session || isSending || session.remainingMessages <= 0 || isExportReady}
            onChange={setDraftMessage}
            onSubmit={handleSend}
            placeholder={isExportReady ? "Project complete. Open the export package to continue." : session?.remainingMessages === 0 ? "Anonymous trial limit reached." : "Reply with details, paste notes, or ask what to decide next..."}
            value={draftMessage}
          />
        </div>
      </section>

      <aside className="fixed right-0 top-0 hidden h-screen w-[340px] border-l border-[#2a2d37] bg-[#12131a] px-7 py-8 lg:block">
        <h2 className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-[#e2e1eb]/80">Requirement Read</h2>

        <div className="mt-8 space-y-7">
          <section className="rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-4">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Build readiness</h3>
                <p className="mt-2 text-sm text-[#f7f7fa]">{STEP_LABELS[metadata.step]} clarification</p>
              </div>
              <span className="font-mono text-xl text-[#adc6ff]">{metadata.progress}%</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#282a31]">
              <div className="h-full rounded-full bg-[#adc6ff]" style={{ width: `${metadata.progress}%` }} />
            </div>
            <p className="mt-4 text-xs leading-5 text-[#8c909f]">
              Confidence {metadata.confidence}%. The current question should advance the {STEP_LABELS[metadata.step].toLowerCase()} step.
            </p>
          </section>

          <section>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Captured context</h3>
            <div className="space-y-2">
              {captured.slice(0, 4).map((tag) => (
                <div className="rounded-[3px] border border-[#33343c] bg-[#1a1b22] px-3 py-2 text-sm leading-5 text-[#c2c6d6]" key={tag}>
                  {tag}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Missing decisions</h3>
            <div className="space-y-2">
              {missingDecisions.slice(0, 4).map((decision) => (
                <div className="flex gap-2 rounded-[3px] border border-[#33343c] bg-[#0c0e14] px-3 py-2 text-sm leading-5 text-[#c2c6d6]" key={decision}>
                  <ArchitectIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#adc6ff]" name="warning" />
                  <span>{decision}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-between border-t border-[#2a2d37] pt-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Trial use</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#adc6ff]">
              {session ? `${usedMessages}/${session.maxMessages}` : "0/10"} messages
            </span>
          </section>
        </div>
      </aside>
    </main>
  );
}
