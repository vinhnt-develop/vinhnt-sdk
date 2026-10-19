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

/**
 * Full approval reply: the decision plus an optional user-supplied reason
 * (e.g. why a tool call was rejected). Additive companion to
 * {@link PermissionReply}; surfaced by `ApprovalStore.awaitReplyWithReason`.
 */
export interface ApprovalReply {
  readonly reply: PermissionReply;
  readonly reason?: string;
}

export interface SavedApproval {
  readonly resource: string;
  readonly action: string;
  readonly agentId?: string;
}
