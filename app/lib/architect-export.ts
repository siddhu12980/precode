import Groq from "groq-sdk";
import type { AnonymousSession } from "./anonymous-sessions";
import { latestAssistantMetadata } from "./anonymous-sessions";
import type { ArchitectExportArtifact, ArchitectExportSnapshot } from "./architect-progress";

const GROQ_MODEL = "qwen/qwen3-32b";

type RawArchitectExport = {
  prdMarkdown?: unknown;
  architectureMarkdown?: unknown;
  codexPrompt?: unknown;
  capturedContext?: unknown;
  importantMissingItems?: unknown;
  securityNotes?: unknown;
};

const EXPORT_SYSTEM_PROMPT = `
You are Architect Mode Exporter. Convert an accepted app-planning session into final implementation artifacts.

Rules:
- Do not interview the user.
- Do not invent new product scope. If something is missing, list it as an implementation assumption or important missing item.
- Generate practical Markdown that a coding agent can implement from.
- Keep the output specific to the accepted context.
- Return only valid JSON with this exact shape:
{
  "prdMarkdown": "# PRD\\n...",
  "architectureMarkdown": "# Architecture\\n...",
  "codexPrompt": "You are Codex...",
  "capturedContext": ["Short accepted fact"],
  "importantMissingItems": ["Short missing item or assumption"],
  "securityNotes": ["Short security/privacy note"]
}

PRD.md must include product summary, target user, MVP scope, core features, out of scope, user stories, data/storage requirements, security/privacy requirements, and acceptance criteria.
ARCHITECTURE.md must include recommended stack, app structure, data model overview, key workflows, security design, testing plan, and build roadmap/milestones.
The Codex prompt must assume the user has pasted PRD.md and ARCHITECTURE.md, tell Codex to read both first, preserve scope, ask only if required information is missing, and run lint/build/tests before final response.
`.trim();

function normalizeStringList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean).slice(0, 8);
}

function extractJsonObject(raw: string) {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function latestAssistantContent(session: AnonymousSession) {
  return session.messages
    .slice()
    .reverse()
    .find((message) => message.role === "assistant")?.content;
}

export function createArchitectExportSnapshot(session: AnonymousSession): ArchitectExportSnapshot {
  const metadata = latestAssistantMetadata(session);
  const firstUserMessage = session.messages.find((message) => message.role === "user")?.content ?? "New product";

  return {
    productSummary: latestAssistantContent(session) ?? firstUserMessage,
    capturedContext: metadata?.capturedContext ?? [],
    missingDecisions: metadata?.missingDecisions ?? [],
    acceptedArchitecture: metadata?.capturedContext ?? [],
    transcript: session.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}

function fallbackCodexPrompt() {
  return [
    "You are Codex working in an existing repository.",
    "Read the pasted PRD.md and ARCHITECTURE.md first.",
    "Implement the app exactly within that scope. Do not add unrelated features.",
    "If required information is missing, ask a concise question before coding.",
    "Run lint, build, and relevant tests before your final response.",
  ].join("\n");
}

function parseArchitectExport(raw: string, snapshot: ArchitectExportSnapshot): ArchitectExportArtifact {
  const jsonObject = extractJsonObject(raw);

  if (!jsonObject) {
    throw new Error("Export model returned an invalid response.");
  }

  const parsed = JSON.parse(jsonObject) as RawArchitectExport;
  const prdMarkdown = typeof parsed.prdMarkdown === "string" ? parsed.prdMarkdown.trim() : "";
  const architectureMarkdown = typeof parsed.architectureMarkdown === "string" ? parsed.architectureMarkdown.trim() : "";

  if (!prdMarkdown || !architectureMarkdown) {
    throw new Error("Export model did not return both PRD and architecture Markdown.");
  }

  return {
    prdMarkdown,
    architectureMarkdown,
    codexPrompt: typeof parsed.codexPrompt === "string" && parsed.codexPrompt.trim() ? parsed.codexPrompt.trim() : fallbackCodexPrompt(),
    capturedContext: normalizeStringList(parsed.capturedContext, snapshot.capturedContext),
    importantMissingItems: normalizeStringList(parsed.importantMissingItems, snapshot.missingDecisions),
    securityNotes: normalizeStringList(parsed.securityNotes, ["Protect private user data and avoid logging sensitive task content."]),
    generatedAt: new Date().toISOString(),
    snapshot,
  };
}

export async function createArchitectExport(session: AnonymousSession) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is required for Architect Mode exports.");
  }

  const snapshot = createArchitectExportSnapshot(session);
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: EXPORT_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify(snapshot, null, 2),
      },
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("Groq returned an empty export response.");
  }

  return parseArchitectExport(reply, snapshot);
}
