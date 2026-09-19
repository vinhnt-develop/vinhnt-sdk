import type { RequestId, TraceId } from "../branded.js";

/** Options for VntError construction */
export type VntErrorCtx = {
  requestId?: RequestId | undefined;
  traceId?: TraceId | undefined;
  code?: string | undefined;
  retryable?: boolean | undefined;
  cause?: unknown | undefined;
};

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
 * Base error for all VNT Agent errors.
 * Carries correlation IDs so every throw is traceable.
 *
 * Follows Mastra's error taxonomy pattern: Domain + Category + machine-readable ID.
 */
export class VntError extends Error {
  public readonly requestId: RequestId | undefined;
  public readonly traceId: TraceId | undefined;
  public readonly code: string | undefined;
  public readonly retryable: boolean;
  /** Error domain — which subsystem caused the error. */
  public readonly domain: ErrorDomain | undefined;
  /** Error category — who is responsible. */
  public readonly category: ErrorCategory | undefined;

  constructor(message: string, ctx?: VntErrorCtx & { domain?: ErrorDomain; category?: ErrorCategory }) {
    super(message, { cause: ctx?.cause });
    this.name = "VntError";
    this.requestId = ctx?.requestId;
    this.traceId = ctx?.traceId;
    this.code = ctx?.code;
    this.retryable = ctx?.retryable ?? false;
    this.domain = ctx?.domain;
    this.category = ctx?.category;
  }

  /**
   * Type-safe error checking (works across module boundaries).
   */
  static isInstance(error: unknown): error is VntError {
    return error instanceof VntError;
  }
}
