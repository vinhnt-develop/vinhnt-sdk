import { VntError } from "./base.js";

export class ToolNotFoundError extends VntError {
  constructor(public readonly toolName: string) {
    super(`Tool not found: ${toolName}`);
    this.name = "ToolNotFoundError";
  }
}

export class ToolExecutionError extends VntError {
  constructor(
    public readonly toolName: string,
    cause: string,
  ) {
    super(`Tool ${toolName} failed: ${cause}`);
    this.name = "ToolExecutionError";
  }
}

export class ToolPermissionDenied extends VntError {
  constructor(
    public readonly toolName: string,
    reason?: string | undefined,
  ) {
    super(`Tool ${toolName} denied${reason ? `: ${reason}` : ""}`);
    this.name = "ToolPermissionDenied";
  }
}
