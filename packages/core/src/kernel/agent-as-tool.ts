/**
 * Agent-as-Tool pattern — wrap a sub-agent as a tool definition.
 *
 * Allows a manager agent to delegate tasks to specialist agents
 * without losing control of the conversation.
 *
 * @module kernel/agent-as-tool
 */

import type { AgentId } from "@vinhnt-sdk/schema";
import { z } from "zod";
import { defineTool, type ToolDefinition } from "@vinhnt-sdk/tools";

export interface AgentAsToolOptions {
  /** The agent ID to delegate to */
  readonly agentId: AgentId;
  /** Tool name (default: "delegate_to_{agentId}") */
  readonly toolName?: string;
  /** Tool description for the LLM */
  readonly toolDescription: string;
  /** Max output length to return to parent (default: 4096) */
  readonly maxOutputLength?: number;
}

/**
 * Create a tool that delegates to a sub-agent.
 *
 * The tool runs the sub-agent in an isolated context and returns
 * its output to the parent agent. The parent stays in control.
 *
 * @example
 * ```typescript
 * const reviewer = createAgent({
 *   id: "code-reviewer",
 *   profile: { name: "Code Reviewer", description: "Reviews code for issues" },
 *   systemPrompt: "You are a code reviewer.",
 *   capabilities: { tools: ["read_file", "grep_files"] },
 * });
 *
 * registry.register(reviewer);
 *
 * const tool = agentAsTool({
 *   agentId: "code-reviewer" as AgentId,
 *   toolDescription: "Delegate code review to specialist",
 * });
 *
 * // Register as tool for manager agent
 * toolRegistry.register(tool);
 * ```
 */
export function agentAsTool(options: AgentAsToolOptions): ToolDefinition {
  const {
    agentId,
    toolName = `delegate_to_${agentId}`,
    toolDescription,
    maxOutputLength = 4096,
  } = options;

  return defineTool({
    name: toolName,
    description: toolDescription,
    risk: "write" as const,
    input: z.object({
      prompt: z.string().describe("The task or question to delegate to the specialist agent"),
      context: z.string().optional().describe("Additional context for the specialist"),
    }),
    execute: async (input, ctx) => {
      const fullPrompt = input.context
        ? `${input.prompt}\n\nAdditional context:\n${input.context}`
        : input.prompt;

      return `[DELEGATE:${agentId}] ${fullPrompt}`;
    },
  }).toDefinition();
}

/**
 * Create a handoff tool — transfers control to another agent.
 *
 * Unlike agent-as-tool, handoff gives full control to the target agent.
 * The original agent pauses until the target agent completes or transfers back.
 *
 * @example
 * ```typescript
 * const handoffTool = createHandoffTool({
 *   agentId: "billing" as AgentId,
 *   toolDescription: "Transfer to billing specialist",
 *   onHandoff: (reason) => console.log("Handing off:", reason),
 * });
 * ```
 */
export function createHandoffTool(options: {
  readonly agentId: AgentId;
  readonly toolName?: string;
  readonly toolDescription: string;
  readonly onHandoff?: (reason: string) => void | Promise<void>;
}): ToolDefinition {
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
      reason: z.string().describe("Reason for the handoff"),
      summary: z.string().optional().describe("Summary of conversation so far"),
    }),
    execute: async (input, ctx) => {
      if (onHandoff) {
        await onHandoff(input.reason);
      }
      return `[HANDOFF:${agentId}] reason=${input.reason}${input.summary ? ` summary=${input.summary}` : ""}`;
    },
  }).toDefinition();
}
