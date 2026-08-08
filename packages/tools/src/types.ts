import type { ToolDefinition } from "./definitions.js";

export type ToolExecutionResult =
  | { status: "success"; output: unknown }
  | { status: "denied"; reason: string }
  | { status: "error"; error: string };

export interface ToolHook {
  readonly id: string;
  pre?(params: { toolId: string; tool: ToolDefinition; input: unknown }):
    Promise<{ input: unknown } | { denied: string } | null>;
  post?(params: { toolId: string; tool: ToolDefinition; input: unknown; result: ToolExecutionResult }):
    Promise<ToolExecutionResult | null>;
}
