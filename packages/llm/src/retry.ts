/**
 * LLM Retry — provider-scoped retry with exponential backoff.
 *
 * Retry is a separate concern from the adapter. Each adapter captures
 * its retry policy at registration. The retry plugin executes it at
 * durable boundaries (agent step level, not inside the adapter call).
 *
 * @example
 * ```ts
 * import { shouldRetry, calculateDelay } from "@vinhnt-sdk/llm";
 *
 * if (shouldRetry(error, policy, attempt)) {
 *   const delay = calculateDelay(attempt, policy, retryAfterHeader);
 *   await sleep(delay, signal);
 * }
 * ```
 */

import type { RetryPolicy } from "./adapter.js";

/** Default retry configuration. */
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30_000;

/** Default set of retryable HTTP status codes. */
const DEFAULT_RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Determine whether a failure should be retried.
 *
 * @param error - The error that occurred
 * @param policy - The provider's retry policy
 * @param attempt - Current attempt number (0-based)
 * @returns Whether to retry
 */
export function shouldRetry(
  error: { readonly retryable?: boolean; readonly statusCode?: number },
  policy: RetryPolicy | undefined,
  attempt: number,
): boolean {
  const maxRetries = policy?.maxRetries ?? DEFAULT_MAX_RETRIES;
  if (attempt >= maxRetries) return false;

  // If error explicitly says not retryable, don't retry
  if (error.retryable === false) return false;

  // Check status code
  if (error.statusCode !== undefined) {
    const retryableStatuses = policy?.retryableStatuses ?? [...DEFAULT_RETRYABLE_STATUSES];
    if (!retryableStatuses.includes(error.statusCode)) return false;
  }

  return true;
}

/**
 * Calculate retry delay with exponential backoff + jitter.
 *
 * @param attempt - Current attempt number (0-based)
 * @param policy - The provider's retry policy
 * @param retryAfterMs - Optional Retry-After header value in ms
 * @returns Delay in ms before the next attempt
 */
export function calculateDelay(
  attempt: number,
  policy: RetryPolicy | undefined,
  retryAfterMs?: number,
): number {
  const baseDelay = policy?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelay = policy?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  // Use Retry-After if provided
  if (retryAfterMs !== undefined && retryAfterMs > 0) {
    return Math.min(retryAfterMs, maxDelay);
  }

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = exponentialDelay * 0.2 * Math.random();
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep for a given duration, abortable via signal.
 *
 * @param ms - Duration in milliseconds
 * @param signal - Optional abort signal
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    // Cleanup: if the timer fires first, remove the abort listener
    void Promise.resolve().then(() => {
      signal?.removeEventListener("abort", onAbort);
    });
  });
}
