import type { SessionMessage } from "./anonymous-sessions";
import type { ArchitectAssistantResponse, ArchitectResponseMetadata } from "./architect-progress";

const CODE_REQUEST_PATTERNS = [
  /\b(write|generate|create|build|give|show|provide|send)\b.{0,30}\b(code|script|function|class|component|api|endpoint|sql|query|regex|algorithm)\b/i,
  /\b(code|script|function|class|component|api|endpoint|sql|query|regex|algorithm)\b.{0,30}\b(for|to)\b/i,
  /\b(debug|fix|solve|patch|refactor|optimize|implement|complete)\b.{0,30}\b(code|bug|error|issue|program|script|function|component|api|endpoint|query)\b/i,
  /\bpython|javascript|typescript|java|c\+\+|c#|golang|go|rust|php|ruby|bash|shell\b/i,
];

const CODE_DELIVERY_HINTS = [
  /\bcode\b/i,
  /\bscript\b/i,
  /\bfunction\b/i,
  /\bcomponent\b/i,
  /\bendpoint\b/i,
  /\bquery\b/i,
  /\bexample\b/i,
  /\bsnippet\b/i,
  /```/,
  /\bimport\b.+\bfrom\b/i,
  /\bdef\s+\w+\s*\(/i,
  /\bfunction\s+\w+\s*\(/i,
  /\bclass\s+\w+/i,
];

const PLANNING_HINTS = [
  /\barchitecture\b/i,
  /\bplan\b/i,
  /\bprd\b/i,
  /\bmvp\b/i,
  /\brequirements\b/i,
  /\buser(s)?\b/i,
  /\bfeature(s)?\b/i,
  /\bworkflow\b/i,
  /\bscope\b/i,
  /\bintegration(s)?\b/i,
  /\bdata model\b/i,
  /\broles?\b/i,
  /\bdeploy(ment|able)?\b/i,
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

  const matchesPlanningHint = PLANNING_HINTS.some((pattern) => pattern.test(normalized));
  const matchesCodePattern = CODE_REQUEST_PATTERNS.some((pattern) => pattern.test(normalized));
  const matchesCodeDeliveryHint = CODE_DELIVERY_HINTS.some((pattern) => pattern.test(normalized));

  if (matchesPlanningHint && !matchesCodePattern) {
    return false;
  }

  return matchesCodePattern && matchesCodeDeliveryHint;
}

export function createOutOfScopeArchitectReply(previousMessages: SessionMessage[]): ArchitectAssistantResponse {
  const previousMetadata = latestAssistantMetadata(previousMessages);

  return {
    content:
      "I can help plan the product and architecture, but I won't generate code, scripts, debugging fixes, or general-purpose technical answers here. Keep this chat focused on app requirements, scope, users, risks, and the default build approach. What product decision should we pin down next for your app?",
    metadata: {
      step: previousMetadata?.step ?? "idea",
      progress: previousMetadata?.progress ?? 8,
      capturedContext: previousMetadata?.capturedContext ?? ["Architect Mode is active for product planning."],
      missingDecisions: previousMetadata?.missingDecisions ?? ["Primary users", "Core workflow", "MVP scope"],
      suggestedDefaults: [
        "Keep this chat for app planning and architecture only.",
        "Move coding, debugging, and script requests to a separate coding agent.",
      ],
      interactionMode: "answer",
      recommendationReady: previousMetadata?.recommendationReady ?? false,
      confidence: previousMetadata?.confidence ?? 92,
    },
  };
}
