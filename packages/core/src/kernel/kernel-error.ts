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
  readonly code: KernelErrorCode;

  constructor(code: KernelErrorCode, message: string, inner?: Error) {
    super(message);
    this.code = code;
    this.name = `KernelError.${code}`;
    if (inner) this.cause = inner;
  }
}
