/**
 * Upstream error mapping + retry/backoff policy for the OpenAI-compatible
 * provider. HTTP failures surface as `UpstreamError` with `ERR_UPSTREAM_*`
 * codes and an accurate `retryable` flag.
 */

import { VntError } from "@vinhnt-sdk/schema";
import { redactSecrets } from "@vinhnt-sdk/guard";

/** HTTP statuses that are safe to retry (transient).
 *
 *  P0.1: 429 (rate limit) is transient when the provider signals a wait
 *  (`Retry-After`) — it MUST be retried. Billing/quota 429s are carved
 *  out separately via `isBillingError` (never retryable). */
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

  constructor(
    status: number,
    message: string,
    opts?: { retryAfterMs?: number; cause?: unknown; retryable?: boolean; code?: string },
  ) {
    super(message, {
      code: opts?.code ?? `ERR_UPSTREAM_${status}`,
      retryable: opts?.retryable ?? RETRYABLE_STATUSES.has(status),
      cause: opts?.cause,
    });
    this.name = "UpstreamError";
    this.status = status;
    this.retryAfterMs = opts?.retryAfterMs;
  }
}

/**
 * `error.code`/`error.type` values that mark a billing/quota failure.
 * These 429/402/403 responses NEVER succeed on retry — waiting does not
 * refill the credit (OpenAI `insufficient_quota`, spend/usage limits,
 * Anthropic-style `billing_error`).
 */
export const BILLING_ERROR_CODES: ReadonlySet<string> = new Set([
  "insufficient_quota",
  "insufficient_user_quota",
  "credit_balance_exhausted",
  "organization_spend_limit_exceeded",
  "project_spend_limit_exceeded",
  "organization_usage_limit_exceeded",
  "billing_error",
]);

/** Message heuristics for providers that omit `error.code` on billing 429s. */
const BILLING_MESSAGE_PATTERN =
  /exceeded your current quota|insufficient quota|credit balance|billing details|add a valid payment method|exceeded your current included usage|insufficient credits/i;

/**
 * Detect a billing/quota failure from an upstream error body.
 * Used to carve billing responses out of the retryable 429 class.
 */
export function isBillingError(body: unknown): boolean {
  if (body && typeof body === "object") {
    const err = (body as { error?: unknown }).error;
    if (err && typeof err === "object") {
      const { code, type } = err as { code?: unknown; type?: unknown };
      if (typeof code === "string" && BILLING_ERROR_CODES.has(code)) return true;
      if (typeof type === "string" && BILLING_ERROR_CODES.has(type)) return true;
    }
    const message = extractRawErrorMessage(body);
    if (message !== undefined && BILLING_MESSAGE_PATTERN.test(message)) return true;
    return false;
  }
  if (typeof body === "string" && body) return BILLING_MESSAGE_PATTERN.test(body);
  return false;
}

/** Extract a human message from an OpenAI-style or plain error body. */
export function extractErrorMessage(body: unknown): string | undefined {
  // RV-43: upstream bodies may echo an API key back verbatim (e.g.
  // `Incorrect API key provided: sk-...`), so every message leaf is redacted
  // here before it can reach an error object, event or log.
  const raw = extractRawErrorMessage(body);
  return raw === undefined ? undefined : redactSecrets(raw);
}

function extractRawErrorMessage(body: unknown): string | undefined {
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
    ...(opts?.fixedBackoffMs !== undefined ? { fixedBackoffMs: opts.fixedBackoffMs } : {}),
    ...(opts?.retryableStatuses !== undefined ? { retryableStatuses: opts.retryableStatuses } : {}),
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

/** Sleep that aborts early when the given signal fires.
 *
 *  RV-50: the abort listener must be removed once the timer completes,
 *  otherwise every backoff attaches one extra listener to long-lived signals
 *  that never fires again (a listener leak). */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const state: { timer?: ReturnType<typeof setTimeout> } = {};
    const onAbort = () => {
      if (state.timer !== undefined) clearTimeout(state.timer);
      reject(signal?.reason instanceof Error ? signal.reason : new Error("Aborted"));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    state.timer = timer;
    signal?.addEventListener("abort", onAbort, { once: true });
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
  const billing = isBillingError(body);
  return new UpstreamError(
    status,
    fallback ?? `Upstream request failed with HTTP ${status}`,
    {
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      ...(cause !== undefined ? { cause } : {}),
      // P0.2: billing/quota failures must never be retried, whatever the
      // status — surface a dedicated code so the app can show "top up".
      ...(billing ? { retryable: false, code: "ERR_BILLING_REQUIRED" } : {}),
    },
  );
}