"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArchitectIcon } from "../../components/icons";
import { ProfileBadge, WorkflowSidebar, type WorkflowStep } from "../../components/workflow-sidebar";
import { generateAnonymousSessionExport, getAnonymousSession, getStoredAnonymousSessionId } from "../../lib/anonymous-session-client";
import type { ArchitectExportArtifact } from "../../lib/architect-progress";

const exportSteps: WorkflowStep[] = [
  { label: "Idea", icon: "idea", completed: true },
  { label: "Users", icon: "users", completed: true },
  { label: "Features", icon: "features", completed: true },
  { label: "Risks", icon: "risks", completed: true },
  { label: "Architecture", icon: "architecture", completed: true },
  { label: "Export", icon: "export", active: true, gap: true },
];

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-5">
      <p className="text-sm leading-6 text-[#c2c6d6]">{message}</p>
      <Link className="mt-4 inline-block rounded-[3px] bg-[#adc6ff] px-4 py-2 font-mono text-xs font-medium tracking-[0.08em] text-[#002e6a]" href="/home">
        Start from workspace
      </Link>
    </div>
  );
}

export function AgentPromptSession() {
  const [artifact, setArtifact] = useState<ArchitectExportArtifact | null>(null);
  const [status, setStatus] = useState("Loading agent prompt...");
  const [copyStatus, setCopyStatus] = useState("");
  const didStartLoadRef = useRef(false);

  useEffect(() => {
    if (didStartLoadRef.current) {
      return;
    }

    didStartLoadRef.current = true;

    async function loadPrompt() {
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

        if (loadedSession.exportArtifact) {
          setArtifact(loadedSession.exportArtifact);
          setStatus("");
          return;
        }

        if (loadedSession.status !== "export_ready") {
          setStatus("This project is not ready for an agent prompt yet. Finish the architecture confirmation in chat first.");
          return;
        }

        setStatus("Generating agent prompt...");
        const payload = await generateAnonymousSessionExport(loadedSession.id);
        setArtifact(payload.exportArtifact);
        setStatus("");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load agent prompt.");
      }
    }

    void loadPrompt();
  }, []);

  async function copyPrompt() {
    if (!artifact) {
      return;
    }

    await navigator.clipboard.writeText(artifact.agentPrompt || artifact.codexPrompt || "");
    setCopyStatus("Agent prompt copied");
    window.setTimeout(() => setCopyStatus(""), 1800);
  }

  const prompt = artifact?.agentPrompt || artifact?.codexPrompt || "";

  return (
    <main className="min-h-screen bg-[#12131a] text-[#e2e1eb] lg:h-screen lg:overflow-hidden">
      <WorkflowSidebar projectMeta="Agent prompt" projectTitle="New product" steps={exportSteps} />

      <section className="flex min-h-screen flex-col lg:ml-[280px] lg:mr-[340px] lg:h-screen">
        <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-[#2a2d37] bg-[#12131a]/85 px-5 py-4 backdrop-blur-md lg:px-10">
          <div>
            <p className="text-sm font-medium text-[#f7f7fa]">Universal agent prompt</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">Exported from Precode for Codex, Cursor, Claude Code, and similar coding agents</p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-[3px] border border-[#424754] bg-[#1a1b22] px-4 py-2 font-mono text-xs tracking-[0.1em] text-[#d8e2ff] transition hover:border-[#adc6ff] hover:text-[#adc6ff]" href="/export">
              Back to export
            </Link>
            <ProfileBadge />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 pb-10 lg:px-10 lg:pb-12">
          <div className="mx-auto max-w-[980px] space-y-5">
            {status && !artifact ? <EmptyState message={status} /> : null}

            {artifact ? (
              <>
                <section className="rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">How to use</p>
                  <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">
                    Paste this prompt into your coding agent after PRD.md and ARCHITECTURE.md. It is exported from Precode and written to work across coding agents, not just one tool.
                  </p>
                </section>

                <section className="rounded-[4px] border border-[#33343c] bg-[#0c0e14]">
                  <div className="flex flex-col gap-3 border-b border-[#2a2d37] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Artifact</p>
                      <h1 className="mt-1 text-lg font-medium text-[#f7f7fa]">AGENT_PROMPT.md</h1>
                    </div>
                    <button
                      className="inline-flex items-center gap-2 rounded-[3px] border border-[#424754] bg-[#1a1b22] px-3 py-2 font-mono text-xs text-[#d8e2ff] transition hover:border-[#adc6ff] hover:text-[#adc6ff]"
                      onClick={copyPrompt}
                      type="button"
                    >
                      <ArchitectIcon className="h-4 w-4" name="copy" />
                      Copy
                    </button>
                  </div>
                  <pre className="max-h-[68vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-6 text-[#d8e2ff] lg:max-h-[calc(100vh-250px)]">{prompt}</pre>
                </section>

                {copyStatus ? <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#adc6ff]">{copyStatus}</p> : null}
              </>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="border-t border-[#2a2d37] bg-[#12131a] px-5 py-6 lg:fixed lg:right-0 lg:top-0 lg:block lg:h-screen lg:w-[340px] lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-7 lg:py-8">
        <h2 className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-[#e2e1eb]/80">Prompt notes</h2>

        <div className="mt-6 space-y-6">
          <section className="rounded-[3px] border border-[#33343c] bg-[#0c0e14] p-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Scope discipline</h3>
            <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">The prompt tells the coding agent to read the planning docs first, preserve scope, and ask only if a required detail is missing.</p>
          </section>
          <section className="rounded-[3px] border border-[#33343c] bg-[#0c0e14] p-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Verification</h3>
            <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">The prompt also requires lint, build, and relevant tests before the coding agent gives its final response.</p>
          </section>
        </div>
      </aside>
    </main>
  );
}
