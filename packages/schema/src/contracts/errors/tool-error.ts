import { VntError } from "./base.js";

/** Thrown when a tool name cannot be found in the registry. */
export class ToolNotFoundError extends VntError {
  public readonly code = "TOOL_NOT_FOUND";
  public readonly retryable = false;

  constructor(public readonly toolName: string) {
    super(`Tool not found: ${toolName}`);
    this.name = "ToolNotFoundError";
  }
}

/** Thrown when a tool execution fails. */
export class ToolExecutionError extends VntError {
  public readonly code = "TOOL_EXECUTION_ERROR";
  public readonly retryable = false;

  constructor(
    public readonly toolName: string,
    cause: string,
  ) {
    super(`Tool ${toolName} failed: ${cause}`);
    this.name = "ToolExecutionError";
  }
}

/** Thrown when a tool call is denied by permission rules. */
export class ToolPermissionDenied extends VntError {
  public readonly code = "TOOL_PERMISSION_DENIED";
  public readonly retryable = false;

  constructor(
    public readonly toolName: string,
    reason?: string | undefined,
  ) {
    super(`Tool ${toolName} denied${reason ? `: ${reason}` : ""}`);
    this.name = "ToolPermissionDenied";
  }
}
