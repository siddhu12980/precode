import { AbuseControlConfigError, RateLimitError, RedisLockError } from "./anonymous-abuse-controls";

type PublicError = {
  message: string;
  status: number;
};

export function toPublicInfrastructureError(error: unknown, fallback: PublicError): PublicError {
  if (error instanceof RateLimitError) {
    return { message: error.message, status: 429 };
  }

  if (error instanceof RedisLockError) {
    return { message: error.message, status: 409 };
  }

  if (error instanceof AbuseControlConfigError) {
    return {
      message: "Traffic control is recalibrating right now. Try again in a minute.",
      status: 503,
    };
  }

  if (isAiQuotaError(error)) {
    return {
      message: "The planning AI is out of credits and needs a coffee break. Try again a little later.",
      status: 503,
    };
  }

  if (isDatabaseError(error)) {
    return {
      message: "The database is taking a lunch break. Come back in a minute.",
      status: 503,
    };
  }

  if (isProviderTransientError(error)) {
    return {
      message: "The planning engine stumbled mid-thought. Give it another try.",
      status: 502,
    };
  }

  return fallback;
}

function errorText(error: unknown) {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`.toLowerCase();
  }

  return String(error ?? "").toLowerCase();
}

function isAiQuotaError(error: unknown) {
  const text = errorText(error);
  return /insufficient[_\s-]?quota|rate limit|credits?|billing|payment required|token limit exceeded|429/.test(text);
}

function isDatabaseError(error: unknown) {
  const text = errorText(error);
  return (
    /prisma/.test(text) ||
    /database/.test(text) ||
    /postgres/.test(text) ||
    /connection pool/.test(text) ||
    /can't reach database server/.test(text) ||
    /prepared statement/.test(text) ||
    /timed out fetching a new connection/.test(text) ||
    /econnrefused|econnreset/.test(text)
  );
}

function isProviderTransientError(error: unknown) {
  const text = errorText(error);
  return /groq|fetch failed|network|timeout|empty precode|empty response|service unavailable|bad gateway/.test(text);
}
