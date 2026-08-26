import { VntError } from "./base.js";
import type { AgentId } from "../branded.js";

/** Thrown when an agent id cannot be found in the registry. */
export class AgentNotFoundError extends VntError {
  public override readonly code = "AGENT_NOT_FOUND";
  public override readonly retryable = false;

  constructor(public readonly agentId: AgentId) {
    super(`Agent not found: ${agentId}`);
    this.name = "AgentNotFoundError";
  }
}

/** Thrown when an agent config fails validation. */
export class AgentValidationError extends VntError {
  public override readonly code = "AGENT_VALIDATION_ERROR";
  public override readonly retryable = false;
  public readonly details: readonly string[];

  constructor(message: string, details?: readonly string[]) {
    super(message);
    this.name = "AgentValidationError";
    this.details = details ?? [];
  }
}

/** Thrown when an agent is denied access to a resource. */
export class AgentPermissionDenied extends VntError {
  public override readonly code = "AGENT_PERMISSION_DENIED";
  public override readonly retryable = false;

  constructor(
    public readonly agentId: AgentId,
    public readonly resource: string,
    reason?: string,
  ) {
    super(`Agent ${agentId} denied access to ${resource}${reason ? `: ${reason}` : ""}`);
    this.name = "AgentPermissionDenied";
  }
}
