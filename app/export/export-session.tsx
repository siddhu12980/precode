"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArchitectIcon } from "../components/icons";
import { ProfileBadge, WorkflowSidebar, type WorkflowStep } from "../components/workflow-sidebar";
import {
  type ClientAnonymousSession,
  generateAnonymousSessionExport,
  getAnonymousSession,
  getStoredAnonymousSessionId,
} from "../lib/anonymous-session-client";
import type { ArchitectExportArtifact } from "../lib/architect-progress";

type ArtifactTab = "prd" | "architecture" | "codex";

const exportSteps: WorkflowStep[] = [
  { label: "Idea", icon: "idea", completed: true },
  { label: "Users", icon: "users", completed: true },
  { label: "Features", icon: "features", completed: true },
  { label: "Risks", icon: "risks", completed: true },
  { label: "Architecture", icon: "architecture", completed: true },
  { label: "Export", icon: "export", active: true, gap: true },
];

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function artifactContent(artifact: ArchitectExportArtifact, activeTab: ArtifactTab) {
  if (activeTab === "architecture") {
    return {
      title: "ARCHITECTURE.md",
      content: artifact.architectureMarkdown,
    };
  }

  if (activeTab === "codex") {
    return {
      title: "Codex prompt",
      content: artifact.codexPrompt,
    };
  }

  return {
    title: "PRD.md",
    content: artifact.prdMarkdown,
  };
}

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

export function ExportSession() {
  const [session, setSession] = useState<ClientAnonymousSession | null>(null);
  const [artifact, setArtifact] = useState<ArchitectExportArtifact | null>(null);
  const [status, setStatus] = useState("Loading export...");
  const [copyStatus, setCopyStatus] = useState("");
  const [activeTab, setActiveTab] = useState<ArtifactTab>("prd");

  const activeArtifact = useMemo(() => (artifact ? artifactContent(artifact, activeTab) : null), [activeTab, artifact]);
  const generatedDate = artifact?.generatedAt ? new Date(artifact.generatedAt).toLocaleString() : "";

  useEffect(() => {
    async function loadExport() {
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
          setSession(loadedSession);
          setArtifact(loadedSession.exportArtifact);
          setStatus("");
          return;
        }

        if (loadedSession.status !== "export_ready") {
          setSession(loadedSession);
          setStatus("This project is not ready for export yet. Finish the architecture confirmation in chat first.");
          return;
        }

        setSession(loadedSession);
        setStatus("Generating PRD and architecture package...");
        const payload = await generateAnonymousSessionExport(loadedSession.id);
        setSession(payload.session);
        setArtifact(payload.exportArtifact);
        setStatus("");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to generate export.");
      }
    }

    void loadExport();
  }, []);

  async function copyText(label: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopyStatus(`${label} copied`);
    window.setTimeout(() => setCopyStatus(""), 1800);
  }

  return (
    <main className="min-h-screen bg-[#12131a] text-[#e2e1eb] lg:h-screen lg:overflow-hidden">
      <WorkflowSidebar projectMeta="Export package" projectTitle="New product" steps={exportSteps} />

      <section className="flex min-h-screen flex-col lg:ml-[280px] lg:mr-[340px] lg:h-screen">
        <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-[#2a2d37] bg-[#12131a]/85 px-5 py-4 backdrop-blur-md lg:px-10">
          <div>
            <p className="text-sm font-medium text-[#f7f7fa]">Export package</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c909f]">
              {artifact ? `Generated ${generatedDate}` : "PRD and architecture"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-[3px] border border-[#424754] bg-[#0c0e14] px-4 py-2 font-mono text-xs tracking-[0.1em] text-[#d8e2ff] transition hover:border-[#adc6ff] hover:text-[#adc6ff]" href="/chat">
              View Chat
            </Link>
            <ProfileBadge />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 lg:px-10">
          <div className="mx-auto max-w-[980px] space-y-5">
            {status && !artifact ? (
              session ? (
                <div className="rounded-[4px] border border-[#33343c] bg-[#0c0e14] p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#adc6ff]">Export status</p>
                  <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">{status}</p>
                  {session.status !== "export_ready" ? (
                    <Link className="mt-4 inline-block rounded-[3px] bg-[#adc6ff] px-4 py-2 font-mono text-xs font-medium tracking-[0.08em] text-[#002e6a]" href="/chat">
                      Return to chat
                    </Link>
                  ) : null}
                </div>
              ) : (
                <EmptyState message={status} />
              )
            ) : null}

            {artifact && activeArtifact ? (
              <>
                <section className="grid gap-3 md:grid-cols-3">
                  <button
                    className={`rounded-[4px] border px-4 py-3 text-left transition ${activeTab === "prd" ? "border-[#adc6ff] bg-[#202331] text-[#f7f7fa]" : "border-[#33343c] bg-[#0c0e14] text-[#c2c6d6] hover:border-[#adc6ff]"}`}
                    onClick={() => setActiveTab("prd")}
                    type="button"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em]">PRD</span>
                    <span className="mt-2 block text-sm">Product requirements</span>
                  </button>
                  <button
                    className={`rounded-[4px] border px-4 py-3 text-left transition ${activeTab === "architecture" ? "border-[#adc6ff] bg-[#202331] text-[#f7f7fa]" : "border-[#33343c] bg-[#0c0e14] text-[#c2c6d6] hover:border-[#adc6ff]"}`}
                    onClick={() => setActiveTab("architecture")}
                    type="button"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Architecture</span>
                    <span className="mt-2 block text-sm">Build design</span>
                  </button>
                  <button
                    className={`rounded-[4px] border px-4 py-3 text-left transition ${activeTab === "codex" ? "border-[#adc6ff] bg-[#202331] text-[#f7f7fa]" : "border-[#33343c] bg-[#0c0e14] text-[#c2c6d6] hover:border-[#adc6ff]"}`}
                    onClick={() => setActiveTab("codex")}
                    type="button"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Codex</span>
                    <span className="mt-2 block text-sm">Implementation prompt</span>
                  </button>
                </section>

                <section className="rounded-[4px] border border-[#33343c] bg-[#0c0e14]">
                  <div className="flex flex-col gap-3 border-b border-[#2a2d37] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Artifact</p>
                      <h1 className="mt-1 text-lg font-medium text-[#f7f7fa]">{activeArtifact.title}</h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded-[3px] border border-[#424754] bg-[#1a1b22] px-3 py-2 font-mono text-xs text-[#d8e2ff] transition hover:border-[#adc6ff] hover:text-[#adc6ff]"
                        onClick={() => copyText(activeArtifact.title, activeArtifact.content)}
                        type="button"
                      >
                        <ArchitectIcon className="h-4 w-4" name="copy" />
                        Copy
                      </button>
                      {activeTab !== "codex" ? (
                        <button
                          className="inline-flex items-center gap-2 rounded-[3px] bg-[#adc6ff] px-3 py-2 font-mono text-xs font-medium text-[#002e6a] transition hover:bg-[#d8e2ff]"
                          onClick={() => downloadMarkdown(activeTab === "prd" ? "PRD.md" : "ARCHITECTURE.md", activeArtifact.content)}
                          type="button"
                        >
                          <ArchitectIcon className="h-4 w-4" name="download" />
                          Download
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <pre className="max-h-[58vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-6 text-[#d8e2ff]">{activeArtifact.content}</pre>
                </section>

                {copyStatus ? <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#adc6ff]">{copyStatus}</p> : null}
              </>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="border-t border-[#2a2d37] bg-[#12131a] px-5 py-6 lg:fixed lg:right-0 lg:top-0 lg:block lg:h-screen lg:w-[340px] lg:overflow-y-auto lg:border-l lg:border-t-0 lg:px-7 lg:py-8">
        <h2 className="font-mono text-xs font-medium uppercase tracking-[0.22em] text-[#e2e1eb]/80">Export Read</h2>

        <div className="mt-6 space-y-6">
          <section>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Captured context</h3>
            <div className="space-y-2">
              {(artifact?.capturedContext.length ? artifact.capturedContext : ["Export will appear after generation."]).slice(0, 5).map((item) => (
                <div className="rounded-[3px] border border-[#33343c] bg-[#1a1b22] px-3 py-2 text-sm leading-5 text-[#c2c6d6]" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Important missing</h3>
            <div className="space-y-2">
              {(artifact?.importantMissingItems.length ? artifact.importantMissingItems : ["No final gaps captured yet."]).slice(0, 5).map((item) => (
                <div className="flex gap-2 rounded-[3px] border border-[#33343c] bg-[#0c0e14] px-3 py-2 text-sm leading-5 text-[#c2c6d6]" key={item}>
                  <ArchitectIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#adc6ff]" name="warning" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8c909f]">Security notes</h3>
            <div className="space-y-2">
              {(artifact?.securityNotes.length ? artifact.securityNotes : ["Security notes will appear with the generated export."]).slice(0, 5).map((item) => (
                <div className="rounded-[3px] border border-[#33343c] bg-[#0c0e14] px-3 py-2 text-sm leading-5 text-[#c2c6d6]" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </main>
  );
}
