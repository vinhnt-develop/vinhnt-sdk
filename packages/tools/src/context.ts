/** Reply from human-in-the-loop approval */
export type PermissionReply = "once" | "always" | "reject";

import type { RequestContext } from "@vinhnt-sdk/schema";

/** Context passed to every tool execution — replaces bare AbortSignal */
export interface ToolContext {
  readonly sessionId: string;
  readonly runId: string;
  readonly agentId: string;
  readonly agentName: string;
  readonly signal: AbortSignal;

  /**
   * The parent run's request context (traceId/actorId/tenantId/requestId).
   * Lets handoff tools (delegate/spawn) propagate identity + parent-run
   * linkage to child agents instead of inventing a synthetic context.
   */
  readonly parentContext?: RequestContext;

  /** Environment variables for subprocess execution (shell tool) */
  readonly env: Record<string, string>;

  /**
   * Request human approval for a permission-bound operation.
   * Returns the user's decision: "once" (allow once), "always" (approve forever), or "reject".
   * When reply is "always", savePatterns are persisted as allow rules for future requests.
   */
  ask(input: {
    permission: string;
    resource: string;
    reason: string;
    /** Patterns to save as "always allow" rules if user replies "always". Uses arity-based truncation. */
    savePatterns?: readonly string[];
  }): Promise<PermissionReply>;

  /** Attach metadata to the current tool call (for observability) */
  metadata(input: {
    title?: string;
    metadata?: Record<string, unknown>;
  }): void;

  /**
   * Register a compensation action for saga rollback.
   * If the current run fails or is cancelled, this action will be called
   * to undo the tool's side effect (e.g., restore original file content).
   */
  setCompensation(action: () => Promise<void>): void;
}
