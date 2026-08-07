import type { ToolDefinition } from "./definitions.js";

export interface ApprovalHandler {
  requestApproval(tool: ToolDefinition, input: unknown): Promise<boolean>;
}
