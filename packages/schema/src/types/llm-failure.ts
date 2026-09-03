/**
 * Typed LLM failure — structured error for model call failures.
 *
 * Similar to deepseek-harness's LlmFailure: replaces generic Error with
 * a typed object that carries provider, model, and retry context.
 */

/** Categories of LLM failures for structured error handling. */
export type LlmFailureKind =
  | "rate_limit"
  | "auth"
  | "context_too_long"
  | "invalid_request"
  | "server_error"
  | "timeout"
  | "network"
  | "content_filter"
  | "unknown";

/** Structured error for LLM call failures. */
export interface LlmFailure {
  /** Error category */
  readonly kind: LlmFailureKind;
  /** Human-readable error message */
  readonly message: string;
  /** Provider that failed */
  readonly provider: string;
  /** Model that failed */
  readonly model: string;
  /** HTTP status code (if available) */
  readonly statusCode: number | undefined;
  /** Whether this failure is retryable */
  readonly retryable: boolean;
  /** Suggested retry delay in ms (if retryable) */
  readonly retryAfterMs: number | undefined;
  /** Original error for debugging */
  readonly cause: unknown;
}

/** Create a typed LlmFailure from a generic error. */
export function toLlmFailure(
  error: unknown,
  provider: string,
  model: string,
): LlmFailure {
  if (error && typeof error === "object" && "kind" in error) {
    return error as LlmFailure;
  }

  const message = error instanceof Error ? error.message : String(error);
  const statusCode = extractStatusCode(error);
  const kind = classifyError(message, statusCode);

  return {
    kind,
    message,
    provider,
    model,
    statusCode: statusCode ?? undefined,
    retryable: isRetryable(kind, statusCode),
    retryAfterMs: extractRetryAfter(error) ?? undefined,
    cause: error,
  };
}

function extractStatusCode(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    if ("status" in error && typeof (error as any).status === "number") return (error as any).status;
    if ("statusCode" in error && typeof (error as any).statusCode === "number") return (error as any).statusCode;
    if ("response" in error) {
      const resp = (error as any).response;
      if (resp && typeof resp === "object" && "status" in resp) return resp.status;
    }
  }
  return undefined;
}

function classifyError(message: string, statusCode?: number): LlmFailureKind {
  const msg = message.toLowerCase();
  if (statusCode === 429 || msg.includes("rate limit")) return "rate_limit";
  if (statusCode === 401 || statusCode === 403 || msg.includes("auth") || msg.includes("api key")) return "auth";
  if (msg.includes("context") && msg.includes("too long")) return "context_too_long";
  if (statusCode === 400 || msg.includes("invalid request")) return "invalid_request";
  if (statusCode && statusCode >= 500) return "server_error";
  if (msg.includes("timeout")) return "timeout";
  if (msg.includes("network") || msg.includes("econnrefused") || msg.includes("fetch")) return "network";
  if (msg.includes("content filter") || msg.includes("content_policy")) return "content_filter";
  return "unknown";
}

function isRetryable(kind: LlmFailureKind, statusCode?: number): boolean {
  if (kind === "rate_limit") return true;
  if (kind === "server_error") return true;
  if (kind === "timeout") return true;
  if (kind === "network") return true;
  if (statusCode === 429) return true;
  if (statusCode && statusCode >= 500) return true;
  return false;
}

function extractRetryAfter(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    if ("retryAfter" in error && typeof (error as any).retryAfter === "number") return (error as any).retryAfter;
    if ("headers" in error) {
      const headers = (error as any).headers;
      if (headers && typeof headers === "object" && "retry-after" in headers) {
        const val = Number(headers["retry-after"]);
        if (!isNaN(val)) return val * 1000;
      }
    }
  }
  return undefined;
}
