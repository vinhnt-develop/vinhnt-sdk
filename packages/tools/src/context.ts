/** Reply from human-in-the-loop approval */
export type PermissionReply = "once" | "always" | "reject";

import type { RequestContext, QuestionItem, PlanApprovalStep, UiSurface } from "@vinhnt-sdk/schema";
import type { QuestionReply } from "./question-store.js";
import type { PlanApprovalReply } from "./plan-store.js";

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
   * The active workspace root for this run.
   * Tools should resolve file paths relative to this directory.
   * Falls back to AgentKernelConfig.workspaceRoot if not set per-run.
   */
  readonly workspaceRoot?: string;

  /**
   * Effective sandbox scope for shell execution (P3.3), sourced from
   * `AgentKernelConfig.sandbox.mode`. When set, it overrides the tool's
   * own `sandboxScope` config. Unknown scopes (e.g. `container`) fail
   * closed at execute time with `SandboxUnavailableError`.
   */
  readonly sandboxScope?: string;

  /**
   * P7.1: sanitizer truncation cap (chars) from `ContextBudget.sanitizeLimitChars`.
   * Tools that call `sanitizeForLLM` before returning content should pass this
   * as the limit so guard truncation stays coordinated with the kernel budget
   * instead of the hardcoded 128_000 default.
   */
  readonly sanitizeLimitChars?: number;

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
    /**
     * Optional observer for the resolved reply. Lets a host read a
     * user-supplied reason (e.g. why a call was rejected) while `ask` keeps
     * returning the decision only. Not invoked for auto-approvals.
     */
    onReply?: (reply: PermissionReply, reason?: string) => void;
  }): Promise<PermissionReply>;

  /**
   * Ask the user one or more questions and block until they answer.
   * Durable request/reply path (mirrors {@link ask}): the host emits
   * `question.requested`, waits for a reply, then emits `question.replied`.
   * Returns `{ action: "cancel" }` when no store is wired or the run aborts.
   */
  askQuestion?(input: {
    questions: readonly QuestionItem[];
    /** Offer an "Other" free-text option even when options are predefined. */
    allowCustom?: boolean;
    /** Epoch ms after which the question expires. */
    expiresAt?: number;
    /** Hard timeout in ms (overrides the host default). */
    timeoutMs?: number;
  }): Promise<QuestionReply>;

  /**
   * Present a plan to the user for approval and block until they decide.
   * Durable request/reply path (mirrors {@link askQuestion}): the host emits
   * `plan.requested`, waits for a decision, then emits `plan.replied`.
   * Returns `{ decision: "cancel" }` when no store is wired or the run aborts.
   */
  askPlan?(input: {
    steps: readonly PlanApprovalStep[];
    /** Optional short plan title. */
    title?: string;
    /** Optional rationale for the plan. */
    explanation?: string;
    /** Epoch ms after which the request expires. */
    expiresAt?: number;
    /** Hard timeout in ms (overrides the host default). */
    timeoutMs?: number;
  }): Promise<PlanApprovalReply>;

  /**
   * Render a generative-UI surface for the user (non-blocking). The host emits
   * a durable `ui.surface` event; the client renders it against its approved
   * catalog. No-op (`undefined`) when the host does not support surfaces.
   */
  presentSurface?(surface: UiSurface): Promise<void> | void;

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

  /** Extensible metadata bag for plugins/consumers. */
  readonly extensionData?: Record<string, unknown>;
}
