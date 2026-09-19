import type { ToolDefinition } from "./definitions.js";

/** Result of a tool execution. */
export type ToolExecutionResult =
  | { status: "success"; output: unknown }
  | { status: "denied"; reason: string }
  | { status: "error"; error: string };

/** Lifecycle hook that can intercept a tool call before and after execution. */
export interface ToolHook {
  readonly id: string;
  pre?(params: { toolId: string; tool: ToolDefinition; input: unknown }):
    Promise<{ input: unknown } | { denied: string } | null>;
  post?(params: { toolId: string; tool: ToolDefinition; input: unknown; result: ToolExecutionResult }):
    Promise<ToolExecutionResult | null>;
}

/**
 * Tool middleware — wraps tool execution with cross-cutting concerns.
 *
 * Inspired by Mastra's tool middleware pattern.
 *
 * @example
 * ```typescript
 * const loggingMiddleware: ToolMiddleware = {
 *   id: "logging",
 *   execute: async (tool, input, next) => {
 *     console.log(`Tool ${tool.id} called with`, input);
 *     const result = await next(input);
 *     console.log(`Tool ${tool.id} returned`, result);
 *     return result;
 *   },
 * };
 * ```
 */
export interface ToolMiddleware {
  readonly id: string;
  execute(
    tool: ToolDefinition,
    input: unknown,
    next: (input: unknown) => Promise<ToolExecutionResult>,
  ): Promise<ToolExecutionResult>;
}
