import type { RunId, RequestId } from "../contracts/branded.js";

export interface PermissionRequest {
  readonly id: RequestId;
  readonly runId: RunId;
  readonly toolName: string;
  readonly resource: string;
  readonly reason: string;
  readonly prompt: string;
  readonly occurredAt: string;
}

export type PermissionReply = "once" | "always" | "reject";

export interface SavedApproval {
  readonly resource: string;
  readonly action: string;
  readonly agentId?: string;
}
