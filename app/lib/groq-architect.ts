import Groq from "groq-sdk";
import { ARCHITECT_MODE_SYSTEM_PROMPT } from "./architect-system-prompt";
import type { SessionMessage } from "./anonymous-sessions";
import {
  clampProgress,
  createFallbackMetadata,
  isArchitectStep,
  normalizeStringList,
  type ArchitectAssistantResponse,
} from "./architect-progress";

const GROQ_MODEL = "groq/compound-mini";

type RawArchitectResponse = {
  step?: unknown;
  progress?: unknown;
  message?: unknown;
  capturedContext?: unknown;
  missingDecisions?: unknown;
  suggestedDefaults?: unknown;
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

    return {
      content,
      metadata: {
        step,
        progress: clampProgress(parsed.progress, fallback.progress),
        capturedContext: normalizeStringList(parsed.capturedContext, fallback.capturedContext),
        missingDecisions: normalizeStringList(parsed.missingDecisions, fallback.missingDecisions),
        suggestedDefaults: normalizeStringList(parsed.suggestedDefaults),
        recommendationReady: typeof parsed.recommendationReady === "boolean" ? parsed.recommendationReady : fallback.recommendationReady,
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
                "This session has enough context for initial planning. Do not ask more low-level technical setup questions. If no critical product decision is missing, set recommendationReady true, move to architecture or export, and offer a recommended default build route.",
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
