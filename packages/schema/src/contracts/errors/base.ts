import { SdkError } from "../../errors/sdk-error.js";
import type { ErrorDomain, ErrorCategory } from "../../errors/sdk-error.js";
import type { RequestId, TraceId } from "../branded.js";

export type { ErrorDomain, ErrorCategory } from "../../errors/sdk-error.js";

/** Options for VntError construction */
export type VntErrorCtx = {
  requestId?: RequestId | undefined;
  traceId?: TraceId | undefined;
  code?: string | undefined;
  retryable?: boolean | undefined;
  cause?: unknown | undefined;
};

/** Fallback code for a bare `VntError` thrown without an explicit `ctx.code`. */
const DEFAULT_VNT_CODE = "VNT_ERROR";

/**
 * Base error for all VNT Agent errors.
 * Carries correlation IDs so every throw is traceable.
 *
 * Follows Mastra's error taxonomy pattern: Domain + Category + machine-readable ID.
 *
 * `VntError` is a subclass alias of {@link SdkError} — `SdkError` is the single
 * base of the SDK error hierarchy; `VntError` keeps its historical
 * `(message, ctx)` constructor so existing subclasses/call sites are unchanged.
 */
export class VntError extends SdkError {
  constructor(message: string, ctx?: VntErrorCtx & { domain?: ErrorDomain; category?: ErrorCategory }) {
    super(ctx?.code ?? DEFAULT_VNT_CODE, message, {
      retryable: ctx?.retryable,
      cause: ctx?.cause,
      domain: ctx?.domain,
      category: ctx?.category,
      requestId: ctx?.requestId,
      traceId: ctx?.traceId,
    });
    this.name = "VntError";
  }

  /**
   * Type-safe error checking (works across module boundaries).
   */
  static override isInstance(error: unknown): error is VntError {
    return error instanceof VntError;
  }
}
