/**
 * Handoff — signal that transfers control to another agent.
 *
 * When a tool returns a `Handoff`, the run loop detects it and swaps the
 * active agent. The new agent takes over the conversation from the next step.
 *
 * Follows the OpenAI Agents SDK pattern: handoff is a special tool return
 * value that the runner intercepts, not a regular tool output.
 *
 * @example
 * ```ts
 * import { handoff, type Handoff } from '@vinhnt-sdk/core';
 *
 * // Define a handoff tool
 * const transferToBilling = handoff({
 *   agentId: 'billing-agent',
 *   toolName: 'transfer_to_billing',
 *   toolDescription: 'Transfer to billing specialist for payment issues',
 * });
 *
 * // Register on agent
 * const triageAgent = createAgent({
 *   id: 'triage',
 *   tools: [transferToBilling, ...otherTools],
 * });
 *
 * // When LLM calls transfer_to_billing, run loop detects Handoff
 * // and swaps active agent to billing-agent.
 * ```
 */

import type { AgentId } from "@vinhnt-sdk/schema";
import { z } from "zod";
import { defineTool, type ToolDefinition } from "@vinhnt-sdk/tools";

/**
 * Symbol used to identify handoff results in tool output.
 * The run loop checks for this symbol to detect agent transfers.
 */
export const HANDOFF_SYMBOL = Symbol.for("@vinhnt-sdk/core/handoff");

/**
 * A handoff result — signals the run loop to transfer control.
 *
 * Not a regular tool output. The run loop intercepts this and swaps agents.
 */
export interface Handoff {
  readonly [key: symbol]: true | undefined;
  readonly __handoff: true;
  /** Target agent to transfer control to. */
  readonly targetAgentId: AgentId;
  /** Reason for the handoff (for logging/tracing). */
  readonly reason: string;
  /** Optional summary of conversation so far (passed to target agent). */
  readonly summary?: string | undefined;
  /** Optional context data to pass to the target agent. */
  readonly context?: Record<string, unknown> | undefined;
}

/**
 * Check if a value is a Handoff.
 */
export function isHandoff(value: unknown): value is Handoff {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Handoff).__handoff === true
  );
}

/**
 * Create a Handoff result.
 */
export function createHandoff(options: {
  targetAgentId: AgentId;
  reason: string;
  summary?: string | undefined;
  context?: Record<string, unknown> | undefined;
}): Handoff {
  return {
    [HANDOFF_SYMBOL]: true,
    __handoff: true,
    targetAgentId: options.targetAgentId,
    reason: options.reason,
    summary: options.summary,
    context: options.context,
  };
}

// ---------------------------------------------------------------------------
// Handoff Tool
// ---------------------------------------------------------------------------

export interface HandoffToolOptions {
  /** Target agent ID to transfer to. */
  readonly agentId: AgentId;
  /** Tool name (default: "transfer_to_{agentId}") */
  readonly toolName?: string;
  /** Tool description for the LLM. */
  readonly toolDescription: string;
  /** Callback before handoff (for logging). */
  readonly onHandoff?: (reason: string) => void | Promise<void>;
}

/**
 * Create a handoff tool — when LLM calls it, control transfers to target agent.
 *
 * Unlike `agentAsTool` (parent keeps control), handoff gives full control
 * to the target agent. The original agent pauses until the target completes
 * or transfers back.
 *
 * @example
 * ```ts
 * const handoffTool = createHandoffTool({
 *   agentId: 'billing' as AgentId,
 *   toolDescription: 'Transfer to billing specialist for payment issues',
 *   onHandoff: (reason) => console.log('Transferring:', reason),
 * });
 *
 * // Register on triage agent
 * triageAgent.tools.push(handoffTool);
 *
 * // When LLM calls transfer_to_billing:
 * // 1. Run loop executes the tool
 * // 2. Tool returns Handoff object
 * // 3. Run loop detects Handoff
 * // 4. Active agent swaps to billing-agent
 * // 5. Billing agent continues the conversation
 * ```
 */
export function createHandoffTool(options: HandoffToolOptions): ToolDefinition {
  const {
    agentId,
    toolName = `transfer_to_${agentId}`,
    toolDescription,
    onHandoff,
  } = options;

  return defineTool({
    name: toolName,
    description: toolDescription,
    risk: "write" as const,
    input: z.object({
      reason: z.string().describe("Reason for the handoff — why this agent is better suited"),
      summary: z.string().optional().describe("Summary of conversation so far for context transfer"),
    }),
    execute: async (input, ctx) => {
      if (onHandoff) {
        await onHandoff(input.reason);
      }

      // Return a Handoff object — run loop will intercept this
      return createHandoff({
        targetAgentId: agentId,
        reason: input.reason,
        summary: input.summary,
      });
    },
  }).toDefinition();
}

// ---------------------------------------------------------------------------
// Handoff History
// ---------------------------------------------------------------------------

/**
 * Record of a handoff that occurred during a run.
 */
export interface HandoffRecord {
  /** Timestamp of the handoff. */
  readonly timestamp: number;
  /** Agent that initiated the handoff. */
  readonly fromAgentId: AgentId;
  /** Agent that received control. */
  readonly toAgentId: AgentId;
  /** Reason for the handoff. */
  readonly reason: string;
  /** Step number when handoff occurred. */
  readonly step: number;
}

/**
 * Track handoff history for a run (cycle detection, debugging).
 */
export class HandoffTracker {
  private readonly history: HandoffRecord[] = [];
  private readonly maxDepth: number;

  constructor(maxDepth: number = 10) {
    this.maxDepth = maxDepth;
  }

  /** Record a handoff. Returns false if cycle detected or max depth exceeded. */
  record(record: HandoffRecord): boolean {
    // Cycle detection: check if target agent is already in the chain
    const recentAgents = this.history.slice(-this.maxDepth).map((r) => r.toAgentId);
    if (recentAgents.includes(record.toAgentId)) {
      return false; // Cycle detected
    }

    // Depth check
    if (this.history.length >= this.maxDepth) {
      return false; // Max depth exceeded
    }

    this.history.push(record);
    return true;
  }

  /** Get the full handoff history. */
  getHistory(): readonly HandoffRecord[] {
    return this.history;
  }

  /** Get the chain of agent IDs in this handoff chain. */
  getAgentChain(): AgentId[] {
    return this.history.map((r) => r.toAgentId);
  }

  /** Check if an agent has already been visited (cycle detection). */
  hasVisited(agentId: AgentId): boolean {
    return this.history.some((r) => r.toAgentId === agentId);
  }
}
