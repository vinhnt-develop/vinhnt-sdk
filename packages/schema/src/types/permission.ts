import type { RunId, RequestId } from "../contracts/branded.js";

export interface PermissionRequest {
  readonly id: RequestId;
  readonly runId: RunId;
  readonly toolName: string;
  readonly resource: string;
  readonly reason: string;
  readonly prompt: string;
  readonly occurredAt: string;
  /**
   * Allow-rule patterns that a `"always"` reply would persist (the scope the
   * user is granting). Empty/absent → `"always"` grants no durable scope beyond
   * the current call. Surfaced so the approval UI can show what "always" covers.
   */
  readonly scope?: readonly string[];
  /** Origin of the ask (e.g. `rules` | `risk`) for UI explanation. */
  readonly source?: string;
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
