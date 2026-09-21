/**
 * AgentRunContext — dependency injection container for a single agent run.
 *
 * Follows the OpenAI Agents SDK pattern: a typed context object that is
 * created once per run and shared across all tools, hooks, and guardrails.
 *
 * @example
 * ```ts
 * // User creates a plain context object
 * interface AppContext {
 *   userId: string;
 *   apiKey: string;
 *   db: Database;
 * }
 *
 * // Tools receive AgentRunContext<AppContext> as 2nd parameter
 * const fetchUser = tool({
 *   name: 'fetch_user',
 *   description: 'Fetch user by ID',
 *   parameters: z.object({ userId: z.string() }),
 *   execute: async (args, runContext) => {
 *     const user = await runContext.context.db.getUser(args.userId);
 *     return user;
 *   },
 * });
 *
 * // Kernel creates AgentRunContext internally
 * const kernel = new AgentKernel({ ... });
 * const result = await kernel.run('Get user 123', {
 *   context: { userId: 'u-1', apiKey: 'sk-...', db: myDb },
 * });
 * ```
 */

import type { ToolContext, PermissionReply } from "@vinhnt-sdk/tools";

/**
 * Token usage tracked across a single run.
 */
export interface RunUsage {
  /** Total prompt tokens consumed. */
  promptTokens: number;
  /** Total completion tokens consumed. */
  completionTokens: number;
  /** Total tokens (prompt + completion). */
  totalTokens: number;
  /** Number of model calls made. */
  modelCalls: number;
  /** Number of tool calls made. */
  toolCalls: number;
}

/**
 * Approval record for a tool call.
 */
export interface ApprovalRecord {
  readonly toolName: string;
  readonly callId: string;
  readonly decision: "once" | "always" | "reject";
  readonly timestamp: number;
}

/**
 * AgentRunContext carries all state for a single agent run.
 *
 * - `context`: user's application state (generic, typed)
 * - `usage`: cumulative token usage
 * - `signal`: abort signal for cancellation
 * - `approvals`: tool approval decisions
 *
 * The context is **mutable** — tools can read/write `context` and all
 * tools in the same run see the mutations (shared reference).
 */
export class AgentRunContext<TContext = unknown> {
  /** User's application state. */
  context: TContext;

  /** Cumulative usage for this run. */
  usage: RunUsage;

  /** Abort signal — tools should check `signal.aborted` before long operations. */
  readonly signal: AbortSignal;

  /** Session ID for this run. */
  readonly sessionId: string;

  /** Run ID. */
  readonly runId: string;

  /** Agent ID. */
  readonly agentId: string;

  /** Agent name. */
  readonly agentName: string;

  /** Environment variables (for subprocess execution). */
  readonly env: Record<string, string>;

  /**
   * The active workspace root for this run.
   * Tools should resolve file paths relative to this directory.
   */
  readonly workspaceRoot?: string;

  /** Tool approval decisions (toolName+callId → decision). */
  readonly approvals: Map<string, ApprovalRecord>;

  /** Compensation actions for saga rollback. */
  readonly compensations: Array<() => Promise<void>>;

  /** Extension data for plugins. */
  readonly extensionData: Record<string, unknown>;

  /** Current tool input (set before tool execute, cleared after). */
  toolInput?: unknown;

  constructor(
    context: TContext,
    options: {
      signal: AbortSignal;
      sessionId: string;
      runId: string;
      agentId: string;
      agentName: string;
      env?: Record<string, string>;
      workspaceRoot?: string;
    },
  ) {
    this.context = context;
    this.signal = options.signal;
    this.sessionId = options.sessionId;
    this.runId = options.runId;
    this.agentId = options.agentId;
    this.agentName = options.agentName;
    this.env = options.env ?? {};
    if (options.workspaceRoot !== undefined) {
      this.workspaceRoot = options.workspaceRoot;
    }
    this.approvals = new Map();
    this.compensations = [];
    this.extensionData = {};
    this.usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      modelCalls: 0,
      toolCalls: 0,
    };
  }

  /**
   * Check if a tool call has been approved.
   * Returns the approval record if found, undefined otherwise.
   */
  getApproval(toolName: string, callId: string): ApprovalRecord | undefined {
    return this.approvals.get(`${toolName}:${callId}`);
  }

  /**
   * Record an approval decision for a tool call.
   */
  setApproval(toolName: string, callId: string, decision: "once" | "always" | "reject"): void {
    this.approvals.set(`${toolName}:${callId}`, {
      toolName,
      callId,
      decision,
      timestamp: Date.now(),
    });
  }

  /**
   * Register a compensation action for saga rollback.
   * If the run fails, compensations are executed in reverse order.
   */
  setCompensation(action: () => Promise<void>): void {
    this.compensations.push(action);
  }

  /**
   * Execute all compensation actions in reverse order.
   * Called automatically on run failure if `saga: true` is set.
   */
  async runCompensations(): Promise<void> {
    const errors: Error[] = [];
    for (const comp of this.compensations.reverse()) {
      try {
        await comp();
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }
    if (errors.length > 0) {
      throw new Error(
        `Compensation errors:\n${errors.map((e) => e.message).join("\n")}`,
      );
    }
  }

  /**
   * Fork context for a sub-agent run (scoped toolInput, shared approvals).
   */
  forkForSubagent(options: { agentId: string; agentName: string }): AgentRunContext<TContext> {
    const childOptions: {
      signal: AbortSignal;
      sessionId: string;
      runId: string;
      agentId: string;
      agentName: string;
      env: Record<string, string>;
      workspaceRoot?: string;
    } = {
      signal: this.signal,
      sessionId: this.sessionId,
      runId: this.runId,
      agentId: options.agentId,
      agentName: options.agentName,
      env: this.env,
    };
    if (this.workspaceRoot !== undefined) {
      childOptions.workspaceRoot = this.workspaceRoot;
    }
    const child = new AgentRunContext<TContext>(this.context, childOptions);
    // Share approvals and extension data by reference
    child.approvals.clear();
    this.approvals.forEach((v, k) => child.approvals.set(k, v));
    Object.assign(child.extensionData, this.extensionData);
    return child;
  }

  /**
   * Create a ToolContext from this RunContext (adapter for existing tool code).
   */
  toToolContext(): ToolContext {
    return {
      sessionId: this.sessionId,
      runId: this.runId,
      agentId: this.agentId,
      agentName: this.agentName,
      signal: this.signal,
      env: this.env,
      ...(this.workspaceRoot !== undefined ? { workspaceRoot: this.workspaceRoot } : {}),
      extensionData: this.extensionData,
      ask: async (input) => {
        // Delegate to approval handler (will be set by kernel)
        return "reject" as PermissionReply;
      },
      metadata: () => {},
      setCompensation: (action) => this.setCompensation(action),
    };
  }
}
