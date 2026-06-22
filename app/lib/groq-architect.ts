import Groq from "groq-sdk";
import { ARCHITECT_MODE_SYSTEM_PROMPT } from "./architect-system-prompt";
import type { SessionMessage } from "./anonymous-sessions";
import { createOutOfScopeArchitectReply, detectOutOfScopeArchitectRequest } from "./architect-guardrails";
import {
  clampProgress,
  createFallbackMetadata,
  isArchitectInteractionMode,
  isArchitectStep,
  normalizeStringList,
  type ArchitectAssistantResponse,
} from "./architect-progress";

// const GROQ_MODEL = "groq/compound-mini";
const GROQ_MODEL = "qwen/qwen3-32b";
const ARCHITECT_REPAIR_PROMPT =
  'Your previous reply did not satisfy the required JSON-only contract. Re-emit the answer as one valid JSON object matching the required shape. Do not include reasoning, markdown, or any text before or after the JSON.';

type RawArchitectResponse = {
  step?: unknown;
  progress?: unknown;
  message?: unknown;
  capturedContext?: unknown;
  missingDecisions?: unknown;
  suggestedDefaults?: unknown;
  interactionMode?: unknown;
  recommendationReady?: unknown;
  confidence?: unknown;
};

const THINK_BLOCK_PATTERN = /<think\b[^>]*>[\s\S]*?<\/think>/gi;
const JSON_FENCE_PATTERN = /^```(?:json)?\s*|\s*```$/gi;

function sanitizeModelOutput(raw: string) {
  return raw.replace(THINK_BLOCK_PATTERN, "").replace(JSON_FENCE_PATTERN, "").trim();
}

function extractJsonObject(raw: string) {
  const trimmed = sanitizeModelOutput(raw);
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function createSafeFallbackReply(): ArchitectAssistantResponse {
  return {
    content:
      "I'm still focused on planning your app, but that response came back in an invalid format, so I'm not going to show it raw. Please continue with a product question: users, MVP scope, core workflow, data sensitivity, or architecture constraints.",
    metadata: createFallbackMetadata(),
  };
}

function parseArchitectResponse(raw: string): ArchitectAssistantResponse | null {
  const fallback = createFallbackMetadata();
  const sanitizedRaw = sanitizeModelOutput(raw);
  const jsonObject = extractJsonObject(raw);

  if (!jsonObject) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonObject) as RawArchitectResponse;
    const step = isArchitectStep(parsed.step) ? parsed.step : fallback.step;
    const content = typeof parsed.message === "string" && sanitizeModelOutput(parsed.message).trim() ? sanitizeModelOutput(parsed.message).trim() : sanitizedRaw;
    const recommendationReady = typeof parsed.recommendationReady === "boolean" ? parsed.recommendationReady : fallback.recommendationReady;
    const parsedSuggestedDefaults = normalizeStringList(parsed.suggestedDefaults);
    let interactionMode = isArchitectInteractionMode(parsed.interactionMode) ? parsed.interactionMode : fallback.interactionMode;

    if (!isArchitectInteractionMode(parsed.interactionMode)) {
      if (step === "export" && recommendationReady) {
        interactionMode = "export_ready";
      } else if (step === "architecture" && recommendationReady && parsedSuggestedDefaults.length) {
        interactionMode = "confirm_architecture";
      }
    }

    const suggestedDefaults = interactionMode === "export_ready" ? [] : parsedSuggestedDefaults;

    if (!content) {
      return null;
    }

    return {
      content,
      metadata: {
        step,
        progress: clampProgress(parsed.progress, fallback.progress),
        capturedContext: normalizeStringList(parsed.capturedContext, fallback.capturedContext),
        missingDecisions: normalizeStringList(parsed.missingDecisions, fallback.missingDecisions),
        suggestedDefaults,
        interactionMode,
        recommendationReady,
        confidence: clampProgress(parsed.confidence, fallback.confidence),
      },
    };
  } catch {
    return null;
  }
}

async function requestArchitectCompletion(
  groq: Groq,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

export async function createGroqArchitectReply({
  content,
  turn,
  previousMessages,
}: {
  content: string;
  turn: number;
  previousMessages: SessionMessage[];
}) {
  if (detectOutOfScopeArchitectRequest(content)) {
    return createOutOfScopeArchitectReply(previousMessages);
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is required for Architect Mode chat responses.");
  }

  const groq = new Groq({ apiKey });
  const baseMessages = [
    {
      role: "system" as const,
      content: ARCHITECT_MODE_SYSTEM_PROMPT,
    },
    ...(turn >= 4
      ? [
          {
            role: "system" as const,
            content:
              "This session has enough context for initial planning. Do not ask more low-level technical setup questions. If no critical product decision is missing, set recommendationReady true, move to architecture or export, and offer a recommended default build route. If you are asking the user to accept a concrete architecture, set interactionMode to confirm_architecture. If the user has accepted it, set interactionMode to export_ready and leave suggestedDefaults empty.",
          },
        ]
      : []),
    ...previousMessages.slice(-8).map((message) => ({
      role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: message.content,
    })),
    {
      role: "user" as const,
      content,
    },
  ];

  const firstReply = await requestArchitectCompletion(groq, baseMessages);

  if (!firstReply) {
    throw new Error("Groq returned an empty Architect Mode response.");
  }

  const parsedFirstReply = parseArchitectResponse(firstReply);

  if (parsedFirstReply) {
    return parsedFirstReply;
  }

  const repairedReply = await requestArchitectCompletion(groq, [
    ...baseMessages,
    {
      role: "assistant",
      content: sanitizeModelOutput(firstReply) || "{}",
    },
    {
      role: "system",
      content: ARCHITECT_REPAIR_PROMPT,
    },
  ]);

  const parsedRepairedReply = repairedReply ? parseArchitectResponse(repairedReply) : null;

  return parsedRepairedReply ?? createSafeFallbackReply();
}
