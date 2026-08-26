import { VntError } from "@vinhnt-sdk/schema";

/** Kernel-level failure codes for {@link KernelError}. */
export type KernelErrorCode =
  | "session_busy"
  | "cancelled"
  | "max_steps_exceeded"
  | "max_tokens_exceeded"
  | "tool_failed"
  | "model_failed"
  | "session_store_failed"
  | "internal_error"
  | "timeout"
  | "model_unavailable";

/** Kernel-level failure with a typed {@link KernelErrorCode}. */
export class KernelError extends VntError {
  public override readonly code: string;
  public override readonly retryable = false;

  constructor(kernelCode: KernelErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.code = kernelCode;
    this.name = `KernelError.${kernelCode}`;
  }
}
