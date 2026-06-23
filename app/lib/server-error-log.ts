type ErrorLogExtra = Record<string, unknown>;

export function logServerError(context: string, error: unknown, extra: ErrorLogExtra = {}) {
  console.error(`[server-error] ${context}`, {
    kind: classifyError(error),
    ...serializeError(error),
    ...extra,
  });
}

function classifyError(error: unknown) {
  const text = errorText(error);

  if (/prisma|postgres|database|can't reach database server|connection pool|prepared statement|timed out fetching a new connection|p\d{4}/.test(text)) {
    return "database";
  }

  if (/upstash|redis|rate_limit_secret|kv_rest_api/.test(text)) {
    return "redis";
  }

  if (/groq|insufficient[_\s-]?quota|credits?|billing|payment required|fetch failed|timeout|service unavailable|bad gateway/.test(text)) {
    return "ai-provider";
  }

  return "unknown";
}

function serializeError(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      errorType: typeof error,
      raw: String(error),
    };
  }

  const details = error as Error & {
    code?: string;
    meta?: unknown;
    clientVersion?: string;
    cause?: unknown;
  };

  return {
    errorName: details.name,
    errorMessage: details.message,
    errorCode: details.code ?? null,
    prismaClientVersion: details.clientVersion ?? null,
    prismaMeta: simplifyValue(details.meta),
    cause: serializeCause(details.cause),
    stackTop: details.stack?.split("\n").slice(0, 6).join("\n") ?? null,
  };
}

function serializeCause(cause: unknown) {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
    };
  }

  return simplifyValue(cause);
}

function simplifyValue(value: unknown) {
  if (value == null) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function errorText(error: unknown) {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`.toLowerCase();
  }

  return String(error ?? "").toLowerCase();
}
