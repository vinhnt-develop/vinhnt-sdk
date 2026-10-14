import type { RequestId, TraceId } from "../contracts/branded.js";

/**
 * Error domain — which subsystem caused the error.
 */
export type ErrorDomain =
  | "llm"
  | "tool"
  | "kernel"
  | "config"
  | "permission"
  | "sandbox"
  | "mcp"
  | "lsp"
  | "session"
  | "plugin";

/**
 * Error category — who is responsible.
 */
export type ErrorCategory =
  | "user"       // bad input from developer/user
  | "system"     // internal SDK error
  | "dependency" // external service failure
  | "config";    // misconfiguration

/**
 * Base error class for all vinhnt-sdk errors.
 * Provides a stable machine-routable `code` field for programmatic error handling.
 *
 * This is THE single base of the SDK error taxonomy: `VntError` and every
 * typed subclass (`KernelError`, `ToolInputError`, `RunNotFoundError`, …)
 * extends `SdkError`.
 *
 * @example
 * ```typescript
 * throw new SdkError('TOOL_NOT_FOUND', 'Tool "foo" not found');
 * if (error.code === 'TOOL_NOT_FOUND') { ... }
 * ```
 */
export class SdkError extends Error {
  /** Machine-readable error code. */
  readonly code: string;
  /** Whether a retry may succeed. */
  readonly retryable: boolean;
  /** Error domain — which subsystem caused the error. */
  readonly domain: ErrorDomain | undefined;
  /** Error category — who is responsible. */
  readonly category: ErrorCategory | undefined;
  /** Correlation id of the originating request, when known. */
  readonly requestId: RequestId | undefined;
  /** Trace id of the originating request, when known. */
  readonly traceId: TraceId | undefined;

  constructor(
    code: string,
    message: string,
    options?: {
      retryable?: boolean | undefined;
      cause?: unknown;
      domain?: ErrorDomain | undefined;
      category?: ErrorCategory | undefined;
      requestId?: RequestId | undefined;
      traceId?: TraceId | undefined;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'SdkError';
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.domain = options?.domain;
    this.category = options?.category;
    this.requestId = options?.requestId;
    this.traceId = options?.traceId;
  }

  /**
   * Type-safe error checking (works across module boundaries).
   */
  static isInstance(error: unknown): error is SdkError {
    return error instanceof SdkError;
  }
}

/**
 * Type guard for SdkError.
 */
export function isSdkError(value: unknown): value is SdkError {
  return value instanceof SdkError;
}

/**
 * Structural error-code check — safe across duplicated package installs where
 * `instanceof` fails because the error class comes from a different copy of
 * this module (e.g. tools@schema 0.5.10 vs step-executor@schema 0.5.11).
 *
 * @example
 * ```typescript
 * if (hasErrorCode(err, 'TOOL_PERMISSION_DENIED')) { ... }
 * ```
 */
export function hasErrorCode(value: unknown, code: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { code?: unknown }).code === code
  );
}

/**
 * Render the full error cause chain, including AggregateError members.
 * Handles circular references and hostile values safely.
 *
 * @example
 * ```typescript
 * try { ... } catch (err) {
 *   console.error(errorChain(err));
 * }
 * ```
 */
export function errorChain(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    const parts: string[] = [];
    const seen = new Set<object>();

    function walk(err: Error, depth: number): void {
      if (depth > 10) return;
      if (seen.has(err)) {
        parts.push(`[circular: ${err.name}]`);
        return;
      }
      seen.add(err);

      const msg = err.message || String(err);
      const prefix = depth > 0 ? ' → ' : '';
      parts.push(`${prefix}${err.name}: ${msg}`);

      if (err instanceof AggregateError) {
        for (const e of err.errors) {
          if (e instanceof Error) {
            walk(e, depth + 1);
          } else {
            parts.push(`  - ${safeString(e)}`);
          }
        }
      }

      if (err.cause instanceof Error) {
        walk(err.cause, depth + 1);
      } else if (err.cause !== undefined) {
        parts.push(`  caused by: ${safeString(err.cause)}`);
      }
    }

    walk(value, 0);
    return parts.join('\n');
  }

  if (typeof value === 'object' && value !== null && 'message' in value) {
    return errorChain((value as { message: unknown }).message);
  }

  return safeString(value);
}

function safeString(value: unknown): string {
  try {
    if (typeof value === 'function') return '[function]';
    if (typeof value === 'symbol') return '[symbol]';
    if (typeof value === 'bigint') return String(value);
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}
