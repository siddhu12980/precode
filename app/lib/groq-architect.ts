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

function extractJsonObject(raw: string) {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function parseArchitectResponse(raw: string): ArchitectAssistantResponse {
  const fallback = createFallbackMetadata();
  const jsonObject = extractJsonObject(raw);

  if (!jsonObject) {
    return {
      content: raw,
      metadata: fallback,
    };
  }

  try {
    const parsed = JSON.parse(jsonObject) as RawArchitectResponse;
    const step = isArchitectStep(parsed.step) ? parsed.step : fallback.step;
    const content = typeof parsed.message === "string" && parsed.message.trim() ? parsed.message.trim() : raw;
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
    return {
      content: raw,
      metadata: fallback,
    };
  }
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
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
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
        role: "user",
        content,
      },
    ],
  });

  const reply = completion.choices[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("Groq returned an empty Architect Mode response.");
  }

  return parseArchitectResponse(reply);
}
