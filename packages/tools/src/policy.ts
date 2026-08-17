import type { ToolDefinition } from "./definitions.js";

/** Handler contract for requesting human approval of a tool call. */
export interface ApprovalHandler {
  requestApproval(tool: ToolDefinition, input: unknown): Promise<boolean>;
}
