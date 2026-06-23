"use client";

import type { ClientAnonymousSession, ClientSessionMessage } from "./anonymous-session-client";
import type { ArchitectExportArtifact, ArchitectResponseMetadata } from "./architect-progress";

export const CHAT_DEMO_STAGES = [
  { label: "Reading brief", detail: "Pulling out the product signal from your last message.", icon: "note" as const },
  { label: "Pressure-testing scope", detail: "Checking users, risks, and missing decisions.", icon: "warning" as const },
  { label: "Composing reply", detail: "Turning the analysis into a concrete architect response.", icon: "spark" as const },
];

export const EXPORT_DEMO_STAGES = [
  { label: "Collecting transcript", detail: "Packing the planning conversation into a clean source bundle.", icon: "note" as const },
  { label: "Shaping system design", detail: "Normalizing architecture, risks, and implementation notes.", icon: "layers" as const },
  { label: "Drafting handoff", detail: "Writing PRD, architecture brief, and agent-ready instructions.", icon: "code" as const },
  { label: "Final packaging", detail: "Assembling the export package for copy and download.", icon: "export" as const },
];

export const CHAT_DEMO_NOTES = [
  "Requirement fragments are being normalized into product language.",
  "Ambiguous scope is being reduced before the next recommendation is issued.",
  "The architect response will preserve the current step and avoid generic chat filler.",
];

export const EXPORT_DEMO_NOTES = [
  "Transcript sections are being merged into stable product requirements.",
  "Architecture defaults are being cross-checked against risks and open decisions.",
  "The package is being structured for handoff, not for conversational reading.",
];

export function wait(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export function createMockChatSession(): ClientAnonymousSession {
  const now = new Date().toISOString();

  return {
    id: "demo-session",
    createdAt: now,
    updatedAt: now,
    maxMessages: 10,
    remainingMessages: 6,
    status: "draft",
    messages: [
      {
        id: "demo-user-1",
        role: "user",
        content: "I want a calm architect workspace that turns rough app ideas into a build-ready planning package.",
        createdAt: now,
      },
      {
        id: "demo-assistant-1",
        role: "assistant",
        content:
          "I can structure this into a focused planning workflow.\n\n- Start with product intent and primary user\n- Tighten MVP boundaries before recommending architecture\n- End with an export package for a coding agent handoff",
        createdAt: now,
        metadata: {
          step: "features",
          progress: 46,
          capturedContext: ["Architecture planning", "Guided workspace", "Agent handoff"],
          missingDecisions: ["Primary user", "Operational constraint", "Success metric"],
          suggestedDefaults: ["Use a three-zone workspace shell.", "Keep the first release web-only."],
          interactionMode: "answer",
          recommendationReady: true,
          confidence: 68,
        },
      },
    ],
  };
}

export function createMockExportSession() {
  const session = createMockChatSession();
  const userMessage: ClientSessionMessage = {
    id: "demo-user-2",
    role: "user",
    content: "Continue with this architecture and prepare the export plan.",
    createdAt: new Date().toISOString(),
  };
  const assistantMessage: ClientSessionMessage = {
    id: "demo-assistant-2",
    role: "assistant",
    content:
      "The architecture is consistent enough to package.\n\n- The workspace shell, guided interview, and export handoff align with the product goal\n- Remaining gaps are operational details, not structural blockers\n- The session can move to export generation",
    createdAt: new Date().toISOString(),
    metadata: {
      step: "architecture",
      progress: 92,
      capturedContext: ["Architecture planning", "Guided workspace", "Export package"],
      missingDecisions: ["Monitoring budget", "Recovery plan"],
      suggestedDefaults: ["Ship one web client and one API service first."],
      interactionMode: "export_ready",
      recommendationReady: true,
      confidence: 88,
    },
  };

  return {
    ...session,
    updatedAt: assistantMessage.createdAt,
    status: "export_ready" as const,
    remainingMessages: 5,
    messages: [...session.messages, userMessage, assistantMessage],
  };
}

export function buildMockAssistantPayload(session: ClientAnonymousSession, content: string) {
  const turn = session.messages.filter((message) => message.role === "user").length + 1;
  const wantsExport = /export|final|handoff|prepare|ready/i.test(content) || turn >= Math.max(session.maxMessages - 1, 3);
  const metadata: ArchitectResponseMetadata = {
    step: wantsExport ? "architecture" : turn <= 2 ? "users" : turn <= 4 ? "features" : "risks",
    progress: wantsExport ? 92 : Math.min(18 + turn * 17, 84),
    capturedContext: buildCapturedContext(session, content),
    missingDecisions: wantsExport ? ["Rollback strategy", "Cost ceiling"] : buildMissingDecisions(content),
    suggestedDefaults: wantsExport
      ? ["Ship with one primary web client, one API service, and a single relational database."]
      : ["Default to email auth first.", "Keep the first release narrow and operationally simple."],
    interactionMode: wantsExport ? "export_ready" : turn >= 4 ? "confirm_architecture" : "answer",
    recommendationReady: turn >= 3,
    confidence: wantsExport ? 88 : Math.min(54 + turn * 8, 82),
  };

  const userMessage: ClientSessionMessage = {
    id: `demo_user_${Date.now()}`,
    role: "user",
    content,
    createdAt: new Date().toISOString(),
  };

  const assistantMessage: ClientSessionMessage = {
    id: `demo_assistant_${Date.now()}`,
    role: "assistant",
    content: wantsExport ? buildExportReadyReply(session, content) : buildAssistantReply(session, content),
    createdAt: new Date().toISOString(),
    metadata,
  };

  const nextSession: ClientAnonymousSession = {
    ...session,
    updatedAt: assistantMessage.createdAt,
    remainingMessages: Math.max(session.remainingMessages - 1, 0),
    status: wantsExport ? "export_ready" : session.status,
    messages: [...session.messages, userMessage, assistantMessage],
  };

  return {
    session: nextSession,
    userMessage,
    assistantMessage,
  };
}

export function buildMockExportPayload(session: ClientAnonymousSession) {
  const exportArtifact = buildMockExportArtifact(session);
  const nextSession: ClientAnonymousSession = {
    ...session,
    updatedAt: exportArtifact.generatedAt,
    status: "export_ready",
    exportArtifact,
  };

  return {
    session: nextSession,
    exportArtifact,
  };
}

function buildMockExportArtifact(session: ClientAnonymousSession): ArchitectExportArtifact {
  const productSummary = session.messages.find((message) => message.role === "user")?.content ?? "New product";
  const capturedContext = buildCapturedContext(session, productSummary);
  const transcript = session.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  return {
    prdMarkdown: `# Product Requirements\n\n## Summary\n${productSummary}\n\n## Users\n- Operators who need a calm planning workspace\n- Founders or product leads preparing an implementation handoff\n\n## MVP\n- Guided architecture interview\n- Structured decision capture\n- Exportable PRD and architecture package\n\n## Risks\n- Anonymous quota confusion\n- Long-running generation without visible progress\n- Missing implementation constraints before handoff\n`,
    architectureMarkdown: `# Architecture\n\n## Proposed Shape\n- Next.js App Router frontend\n- Session and export persistence through the existing anonymous session model\n- External planning generation service for architect responses and exports\n\n## Frontend Notes\n- Preserve the midnight workspace shell\n- Surface long-running processing states in the main working area\n- Keep mobile layouts readable without horizontal scroll\n\n## Operational Concerns\n- Separate session-local counts from abuse-control quotas in user-facing copy\n- Keep demo mode client-only so backend quotas are unaffected\n`,
    agentPrompt: `You are implementing the exported Precode plan.\n\nProduct summary: ${productSummary}\n\nPriorities:\n1. Preserve the Architect Mode UI language.\n2. Keep session and export flows resilient.\n3. Prefer simple deployable defaults over speculative complexity.\n`,
    capturedContext,
    importantMissingItems: ["Production auth provider", "Monitoring budget", "Rollback and recovery flow"],
    securityNotes: ["Apply rate limits at the API boundary.", "Do not trust anonymous client state for access control.", "Review export content before downstream execution."],
    generatedAt: new Date().toISOString(),
    snapshot: {
      productSummary,
      capturedContext,
      missingDecisions: ["Monitoring budget", "SLA expectations"],
      acceptedArchitecture: ["Single web app shell", "Central API layer", "Relational data store"],
      transcript,
    },
  };
}

function buildCapturedContext(session: ClientAnonymousSession, content: string) {
  const values = new Set<string>();
  const combined = `${session.messages.map((message) => message.content).join(" ")} ${content}`.toLowerCase();

  if (combined.includes("ai")) values.add("AI-assisted workflow");
  if (combined.includes("export")) values.add("Structured handoff package");
  if (combined.includes("chat")) values.add("Guided planning conversation");
  if (combined.includes("architect")) values.add("Architecture-first workflow");
  if (combined.includes("mobile")) values.add("Responsive workspace");

  return values.size ? Array.from(values).slice(0, 5) : ["New product idea", "Architecture planning", "Anonymous trial"];
}

function buildMissingDecisions(content: string) {
  const combined = content.toLowerCase();

  if (combined.includes("auth")) {
    return ["Tenant model", "Billing boundary", "Admin permission rules"];
  }

  return ["Primary user type", "Success metric for MVP", "Operational risk threshold"];
}

function buildAssistantReply(session: ClientAnonymousSession, content: string) {
  const productSummary = session.messages.find((message) => message.role === "user")?.content ?? "the product";

  return `I am tightening the plan for **${productSummary}** based on your latest note.\n\n- The strongest signal in your message is **${content.slice(0, 72)}${content.length > 72 ? "..." : ""}**\n- The next useful decision is to make the user flow and constraint boundary more explicit\n- I would keep the first release operationally narrow so the exported handoff stays implementable\n\nReply with delivery constraints, user roles, or the riskiest workflow and I will refine the architecture path.`;
}

function buildExportReadyReply(session: ClientAnonymousSession, content: string) {
  const productSummary = session.messages.find((message) => message.role === "user")?.content ?? "this product";

  return `The architecture is stable enough to package.\n\n- Core direction for **${productSummary}** is now consistent across users, scope, and system shape\n- Your latest note, **${content.slice(0, 64)}${content.length > 64 ? "..." : ""}**, fits the current recommendation without reopening the stack\n- I am marking the session ready for export so the PRD and build brief can be generated\n\nOpen the export package to review the planning handoff.`;
}
