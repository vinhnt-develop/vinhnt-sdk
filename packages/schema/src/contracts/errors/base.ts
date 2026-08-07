import type { RequestId, TraceId } from "../branded.js";

/** Options for VntError construction */
export type VntErrorCtx = {
  requestId?: RequestId | undefined;
  traceId?: TraceId | undefined;
};

/**
 * Base error for all VNT Agent errors.
 * Carries correlation IDs so every throw is traceable.
 */
export class VntError extends Error {
  public readonly requestId: RequestId | undefined;
  public readonly traceId: TraceId | undefined;

  constructor(message: string, ctx?: VntErrorCtx) {
    super(message);
    this.name = "VntError";
    this.requestId = ctx?.requestId;
    this.traceId = ctx?.traceId;
  }
}
