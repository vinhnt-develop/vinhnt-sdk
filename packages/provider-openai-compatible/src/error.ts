/**
 * Upstream error mapping + retry/backoff policy for the OpenAI-compatible
 * provider. HTTP failures surface as `UpstreamError` with `ERR_UPSTREAM_*`
 * codes and an accurate `retryable` flag.
 */

import { VntError } from "@vinhnt-sdk/schema";

/** HTTP statuses that are safe to retry (transient). */
export const RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

/** Retry configuration for the provider's HTTP calls. */
export interface RetryOptions {
  /** Maximum number of retry attempts after the initial request. Default: 3. */
  readonly maxRetries?: number;
  /** Base exponential backoff in ms. Default: 1000. */
  readonly baseBackoffMs?: number;
  /** Cap for exponential backoff in ms. Default: 30000. */
  readonly maxBackoffMs?: number;
  /** Optional fixed retry delay (ms) — overrides backoff when set. */
  readonly fixedBackoffMs?: number;
  /** Extra statuses to treat as retryable (merged with the default set). */
  readonly retryableStatuses?: readonly number[];
}

/** Default retry policy (3 retries, exponential backoff capped at 30s). */
export const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "fixedBackoffMs" | "retryableStatuses">> = {
  maxRetries: 3,
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
};

/**
 * Error representing a non-transient (or exhausted) upstream HTTP failure.
 * Carries the HTTP status and an `ERR_UPSTREAM_<STATUS>` code.
 */
export class UpstreamError extends VntError {
  public readonly status: number;
  public readonly retryAfterMs: number | undefined;

  constructor(status: number, message: string, opts?: { retryAfterMs?: number; cause?: unknown }) {
    super(message, {
      code: `ERR_UPSTREAM_${status}`,
      retryable: RETRYABLE_STATUSES.has(status),
      cause: opts?.cause,
    });
    this.name = "UpstreamError";
    this.status = status;
    this.retryAfterMs = opts?.retryAfterMs;
  }
}

/** Extract a human message from an OpenAI-style or plain error body. */
export function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === "string" && body) return body;
  if (body && typeof body === "object") {
    const err = (body as { error?: unknown }).error;
    if (err && typeof err === "object") {
      const message = (err as { message?: unknown }).message;
      if (typeof message === "string" && message) return message;
    }
    if (err && typeof err === "string" && err) return err;
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return undefined;
}

function normalizeRetryOptions(opts?: RetryOptions): Required<Pick<RetryOptions, "maxRetries" | "baseBackoffMs" | "maxBackoffMs">> & Pick<RetryOptions, "fixedBackoffMs" | "retryableStatuses"> {
  return {
    maxRetries: opts?.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries,
    baseBackoffMs: opts?.baseBackoffMs ?? DEFAULT_RETRY_OPTIONS.baseBackoffMs,
    maxBackoffMs: opts?.maxBackoffMs ?? DEFAULT_RETRY_OPTIONS.maxBackoffMs,
    fixedBackoffMs: opts?.fixedBackoffMs,
    retryableStatuses: opts?.retryableStatuses,
  };
}

/** Full retry status set (defaults + caller extras). */
export function retryableStatusSet(opts?: RetryOptions): Set<number> {
  return new Set([...RETRYABLE_STATUSES, ...(normalizeRetryOptions(opts).retryableStatuses ?? [])]);
}

/**
 * Parse a `Retry-After` header value into milliseconds.
 * Supports both delta-seconds and HTTP-date forms.
 */
export function parseRetryAfterMs(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isFinite(timestamp)) {
    return Math.max(0, timestamp - Date.now());
  }

  return undefined;
}

/** Exponential backoff delay (ms) for a given attempt (0-indexed), capped. */
export function computeBackoffMs(attempt: number, opts?: RetryOptions): number {
  const { baseBackoffMs, maxBackoffMs, fixedBackoffMs } = normalizeRetryOptions(opts);
  if (fixedBackoffMs !== undefined) return fixedBackoffMs;
  const growth = Math.pow(2, attempt) * baseBackoffMs;
  // Small ±10% jitter to avoid synchronized retry storms across clients,
  // applied before the cap so the cap is a hard upper bound.
  const jittered = growth * (0.9 + Math.random() * 0.2);
  return Math.min(Math.round(jittered), maxBackoffMs);
}

/** Sleep that aborts early when the given signal fires. */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason instanceof Error ? signal.reason : new Error("Aborted"));
    }, { once: true });
  });
}

/** Wait for backoff (or Retry-After) between attempts, abortable. */
export async function waitForRetry(
  attempt: number,
  opts: RetryOptions | undefined,
  retryAfterMs?: number,
  signal?: AbortSignal,
): Promise<void> {
  const delay = retryAfterMs ?? computeBackoffMs(attempt, opts);
  await abortableSleep(delay, signal);
}

/**
 * Map an upstream failure into a VntError. Prefers the provider's
 * structured OpenAI error body via `fromOpenAIError`, otherwise produces
 * an `UpstreamError` with an `ERR_UPSTREAM_*` code.
 */
export function toUpstreamError(
  status: number,
  body: unknown,
  headers?: Headers,
  cause?: unknown,
): VntError {
  const retryAfterMs = parseRetryAfterMs(headers?.get("retry-after"));
  const fallback = extractErrorMessage(body);
  return new UpstreamError(
    status,
    fallback ?? `Upstream request failed with HTTP ${status}`,
    { retryAfterMs, cause },
  );
}