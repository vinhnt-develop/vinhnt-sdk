export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
};

function isRetryable(err: unknown, retryableStatuses: number[]): boolean {
  if (err instanceof TypeError) return true; // network error (ECONNRESET, DNS, etc.)
  if (err && typeof err === "object" && "status" in err) {
    return retryableStatuses.includes((err as { status: number }).status);
  }
  const msg = String(err);
  if (msg.includes("429") || msg.includes("503") || msg.includes("502") || msg.includes("504")) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

import { VntError } from "@vinhnt-sdk/core";

export class RetryExhaustedError extends VntError {
  attempts: number;
  originalError: unknown;
  constructor(message: string, attempts: number, originalError: unknown) {
    super(message);
    this.name = "RetryExhaustedError";
    this.attempts = attempts;
    this.originalError = originalError;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: Partial<RetryOptions>,
): Promise<T> {
  const options = { ...DEFAULT_RETRY, ...opts };
  let lastErr: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= options.maxAttempts || !isRetryable(err, options.retryableStatuses)) {
        throw err;
      }
      const delay = Math.min(
        options.baseDelayMs * Math.pow(options.backoffFactor, attempt - 1) + Math.random() * 500,
        options.maxDelayMs,
      );
      await sleep(delay);
    }
  }

  throw lastErr;
}
