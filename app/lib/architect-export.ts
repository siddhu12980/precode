import Groq from "groq-sdk";
import type { AnonymousSession } from "./anonymous-sessions";
import { latestAssistantMetadata } from "./anonymous-sessions";
import type { ArchitectExportArtifact, ArchitectExportSnapshot } from "./architect-progress";

const GROQ_MODEL = "qwen/qwen3-32b";

type RawArchitectExport = {
  prdMarkdown?: unknown;
  architectureMarkdown?: unknown;
  agentPrompt?: unknown;
  codexPrompt?: unknown;
  capturedContext?: unknown;
  importantMissingItems?: unknown;
  securityNotes?: unknown;
};

const EXPORT_SYSTEM_PROMPT = `
You are Architect Mode Exporter. Convert an accepted app-planning session into final implementation artifacts with the quality of a careful senior product architect.

Rules:
- Do not interview the user.
- Do not invent new product scope, features, constraints, integrations, user roles, or technologies. If something is missing, carry it into importantMissingItems or write it as a clearly labeled assumption.
- Generate practical Markdown that a coding agent can implement from, but do not turn the PRD or architecture docs into code-generation output.
- Keep the output specific to the accepted context, the transcript, and the accepted architecture.
- Prefer product clarity over technical decoration. If the session is light, produce a lean but honest plan instead of generic filler.
- Write like an opinionated architect, not like a generic chatbot.
- Ground recommendations in the user's actual scenario. Avoid stock phrases that could fit any app.
- Do not include code fences, code samples, interfaces, pseudo-code, endpoint stubs, or boilerplate implementation snippets in PRD.md or ARCHITECTURE.md.
- Avoid unnecessary vendor or library specificity unless the session clearly accepted that level of detail.
- If the user's conversation drifted into implementation troubleshooting, convert that into a productized, buildable problem statement only if the transcript clearly supports it. Otherwise state the ambiguity in importantMissingItems.
- Return only valid JSON with this exact shape:
{
  "prdMarkdown": "# PRD\\n...",
  "architectureMarkdown": "# Architecture\\n...",
  "agentPrompt": "You are a coding agent...",
  "capturedContext": ["Short accepted fact"],
  "importantMissingItems": ["Short missing item or assumption"],
  "securityNotes": ["Short security/privacy note"]
}

Use the provided snapshot fields as follows:
- productSummary: the clearest short statement of what the product is
- capturedContext: accepted facts and stable requirements
- missingDecisions: unresolved gaps that should not be quietly invented
- acceptedArchitecture: the architecture the user accepted or reviewed
- transcript: supporting evidence for nuance, tradeoffs, and wording

Quality bar:
- The PRD should read like a real product brief for this exact app, not a template filled with buzzwords.
- The architecture doc should explain the default build route and system shape, not dump implementation trivia.
- If a section would be fake or weak because the transcript is sparse, keep it short and explicit rather than generic.
- Every major section should reflect something traceable to the session.

PRD.md must include:
- Product summary
- Problem being solved
- Target users
- MVP scope
- Core features
- Out of scope
- Key user flows or user stories
- Data/storage requirements
- Security/privacy requirements
- Acceptance criteria
- Open assumptions or unresolved items when relevant

ARCHITECTURE.md must include:
- Recommended build route
- Why this route fits the product
- Major system parts and responsibilities
- Data model overview at a conceptual level
- Key workflows
- Risks and engineering notes
- Security design
- Testing plan
- Delivery roadmap or milestones

Writing constraints for ARCHITECTURE.md:
- Describe components and responsibilities in prose and bullets, not code.
- Mention stack choices only when justified by the session.
- Do not fabricate named services, SDKs, database tables, TypeScript interfaces, retry intervals, or test frameworks unless they were clearly implied or accepted.

The agent prompt must:
- Work even if the user has not separately downloaded or saved any files yet
- Assume the user has provided the contents of PRD.md and ARCHITECTURE.md in the conversation
- Tell the coding agent to read both first
- Tell the coding agent to save or recreate local working copies of PRD.md and ARCHITECTURE.md before implementation when the environment allows
- Treat PRD.md as product truth and ARCHITECTURE.md as the default implementation route
- Use those documents as the roadmap for implementation order and decision-making
- Preserve scope
- Treat importantMissingItems as constraints to resolve carefully
- Ask only if required information is missing
- Call out any conflict between the planning docs and the existing codebase before making a risky change
- Run lint, build, and relevant tests before final response
- Avoid adding features not present in the planning docs
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

function acceptedArchitecture(session: AnonymousSession) {
  return (
    session.messages
      .slice()
      .reverse()
      .find((message) => message.role === "assistant" && message.metadata?.interactionMode === "confirm_architecture")
      ?.metadata?.suggestedDefaults ?? []
  );
}

function compactProductSummary(session: AnonymousSession) {
  const firstUserMessage = session.messages.find((message) => message.role === "user")?.content?.trim();
  const latestAssistantMessage = latestAssistantContent(session)?.trim();

  if (firstUserMessage) {
    return firstUserMessage;
  }

  return latestAssistantMessage || "New product";
}

export function createArchitectExportSnapshot(session: AnonymousSession): ArchitectExportSnapshot {
  const metadata = latestAssistantMetadata(session);

  return {
    productSummary: compactProductSummary(session),
    capturedContext: metadata?.capturedContext ?? [],
    missingDecisions: metadata?.missingDecisions ?? [],
    acceptedArchitecture: acceptedArchitecture(session),
    transcript: session.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}

function fallbackAgentPrompt() {
  return [
    "You are a coding agent working in an existing repository.",
    "The user has provided the contents of PRD.md and ARCHITECTURE.md in this conversation.",
    "Read both documents first.",
    "If the environment allows, save or recreate local working copies of PRD.md and ARCHITECTURE.md before implementation so they remain your reference documents.",
    "Treat PRD.md as the source of truth for product scope and ARCHITECTURE.md as the default build route.",
    "Use those documents as your roadmap while implementing.",
    "Implement the app exactly within that scope. Do not add unrelated features.",
    "If the planning docs conflict with the codebase, call out the conflict and choose the least risky path.",
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
    agentPrompt:
      typeof parsed.agentPrompt === "string" && parsed.agentPrompt.trim()
        ? parsed.agentPrompt.trim()
        : typeof parsed.codexPrompt === "string" && parsed.codexPrompt.trim()
          ? parsed.codexPrompt.trim()
          : fallbackAgentPrompt(),
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
    response_format: { type: "json_object" },
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
