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
