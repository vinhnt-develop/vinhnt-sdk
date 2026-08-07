import { VntError } from "./base.js";
import type { AgentId } from "../branded.js";

export class AgentNotFoundError extends VntError {
  constructor(public readonly agentId: AgentId) {
    super(`Agent not found: ${agentId}`);
    this.name = "AgentNotFoundError";
  }
}

export class AgentValidationError extends VntError {
  public readonly details: readonly string[];

  constructor(message: string, details?: readonly string[]) {
    super(message);
    this.name = "AgentValidationError";
    this.details = details ?? [];
  }
}

export class AgentPermissionDenied extends VntError {
  constructor(
    public readonly agentId: AgentId,
    public readonly resource: string,
    reason?: string,
  ) {
    super(`Agent ${agentId} denied access to ${resource}${reason ? `: ${reason}` : ""}`);
    this.name = "AgentPermissionDenied";
  }
}
