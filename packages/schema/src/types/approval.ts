import type { SessionId, AgentId, RunId } from "../contracts/branded.js";

/** Known approval categories. Use as reference, not exhaustive. */
export const KNOWN_APPROVAL_CATEGORIES = [
  "memory.write",
  "skill.write",
  "tool.destructive",
  "tool.read",
  "tool.write",
  "file.delete",
  "file.overwrite",
  "bash.destructive",
  "config.change",
  "agent.spawn",
  "agent.delegate",
  "network.fetch",
  "unknown",
] as const;

/** Approval category — open string for extensibility. */
export type ApprovalCategory = string;

/** Lifecycle status of an approval request. */
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

/** Context attached to an approval request. */
export interface ApprovalContext {
  readonly sessionId?: SessionId;
  readonly agentId?: AgentId;
  readonly runId?: RunId;
  readonly step?: number;
  readonly toolName?: string;
}

/** Human-in-the-loop approval request. */
export interface ApprovalRequest {
  readonly id: string;
  readonly type: ApprovalCategory;
  readonly description: string;
  readonly reason?: string;
  readonly payload: unknown;
  readonly requestedAt: string;
  readonly status: ApprovalStatus;
  readonly context?: ApprovalContext;
  readonly expiresAt?: string;
  readonly resolvedAt?: string;
  readonly resolvedBy?: string;
}

/** Effect an approval policy applies to matching requests. */
export type PolicyEffect = "auto_approve" | "auto_reject" | "require_approval";

/** Declarative policy that auto-approves/rejects matching approval requests. */
export interface ApprovalPolicy {
  readonly id: string;
  readonly pattern: string;
  readonly effect: PolicyEffect;
  readonly priority: number;
  readonly reason?: string;
  readonly scope?: "session" | "agent" | "global";
  readonly expiresAt?: string;
  readonly createdBy?: string;
}

/** Human-readable labels keyed by approval category. */
export const APPROVAL_CATEGORY_LABELS: Record<string, string> = {
  "memory.write":     "Write to memory",
  "skill.write":      "Write skill definition",
  "tool.destructive": "Destructive tool",
  "tool.read":        "Read tool",
  "tool.write":       "Write tool",
  "file.delete":      "Delete file",
  "file.overwrite":   "Overwrite file",
  "bash.destructive": "Destructive bash command",
  "config.change":    "Change configuration",
  "agent.spawn":      "Spawn sub-agent",
  "agent.delegate":   "Delegate to agent",
  "network.fetch":    "Fetch from network",
  "unknown":          "Unknown",
};
