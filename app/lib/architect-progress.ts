export const ARCHITECT_STEPS = ["idea", "users", "features", "risks", "architecture", "export"] as const;

export type ArchitectStep = (typeof ARCHITECT_STEPS)[number];

export type ArchitectResponseMetadata = {
  step: ArchitectStep;
  progress: number;
  capturedContext: string[];
  missingDecisions: string[];
  suggestedDefaults: string[];
  recommendationReady: boolean;
  confidence: number;
};

export type ArchitectAssistantResponse = {
  content: string;
  metadata: ArchitectResponseMetadata;
};

export const STEP_LABELS: Record<ArchitectStep, string> = {
  idea: "Idea",
  users: "Users",
  features: "Features",
  risks: "Risks",
  architecture: "Architecture",
  export: "Export",
};

export function isArchitectStep(value: unknown): value is ArchitectStep {
  return typeof value === "string" && ARCHITECT_STEPS.includes(value as ArchitectStep);
}

export function clampProgress(value: unknown, fallback = 0) {
  const numberValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

export function normalizeStringList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean).slice(0, 5);
}

export function createFallbackMetadata(step: ArchitectStep = "idea", progress = 8): ArchitectResponseMetadata {
  return {
    step,
    progress,
    capturedContext: ["New product idea"],
    missingDecisions: ["Primary users", "Core workflow", "MVP scope"],
    suggestedDefaults: ["Use a simple owner and staff workflow for now."],
    recommendationReady: false,
    confidence: 45,
  };
}
