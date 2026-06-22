import type { SessionMessage } from "./anonymous-sessions";
import type { ArchitectAssistantResponse, ArchitectResponseMetadata } from "./architect-progress";

const EXPLICIT_CODE_REQUEST_PATTERNS = [
  /\b(write|generate|give|show|provide|send)\b.{0,24}\b(python|javascript|typescript|java|c\+\+|c#|go|golang|rust|php|ruby|bash|shell)\b/i,
  /\b(write|generate|give|show|provide|send)\b.{0,24}\b(code|script|function|class|component|sql|regex|query|snippet)\b/i,
  /\bhow do i code\b/i,
  /\bcan you code\b/i,
  /\bdebug\b.{0,24}\b(code|script|function|component|query|program)\b/i,
  /\bfix\b.{0,24}\b(code|script|bug|error|function|component|query)\b/i,
  /```/,
];

function latestAssistantMetadata(previousMessages: SessionMessage[]): ArchitectResponseMetadata | null {
  for (let index = previousMessages.length - 1; index >= 0; index -= 1) {
    const message = previousMessages[index];
    if (message.role === "assistant" && message.metadata) {
      return message.metadata;
    }
  }

  return null;
}

export function detectOutOfScopeArchitectRequest(content: string) {
  const normalized = content.trim();

  if (!normalized) {
    return false;
  }

  return EXPLICIT_CODE_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function createOutOfScopeArchitectReply(previousMessages: SessionMessage[]): ArchitectAssistantResponse {
  const previousMetadata = latestAssistantMetadata(previousMessages);

  return {
    content:
      "I can help plan the product and architecture, but I won’t generate code, scripts, debugging fixes, or technical snippets here. Keep this chat focused on app requirements, scope, users, risks, and the default build approach. What product decision should we pin down next for your app?",
    metadata: {
      step: previousMetadata?.step ?? "idea",
      progress: previousMetadata?.progress ?? 8,
      capturedContext: previousMetadata?.capturedContext ?? ["Architect Mode is active for product planning."],
      missingDecisions: previousMetadata?.missingDecisions ?? ["Primary users", "Core workflow", "MVP scope"],
      suggestedDefaults: [
        "Keep this chat for app planning and architecture only.",
        "Move coding and debugging requests to a separate coding agent.",
      ],
      interactionMode: "answer",
      recommendationReady: previousMetadata?.recommendationReady ?? false,
      confidence: previousMetadata?.confidence ?? 92,
    },
  };
}
