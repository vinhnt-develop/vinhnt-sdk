import { VntError } from "@vinhnt-sdk/schema";

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

export class KernelError extends VntError {
  public readonly code = "KERNEL_ERROR";
  public readonly retryable = false;
  public readonly kernelCode: KernelErrorCode;

  constructor(kernelCode: KernelErrorCode, message: string, cause?: unknown) {
    super(message, { cause });
    this.kernelCode = kernelCode;
    this.name = `KernelError.${kernelCode}`;
  }
}
