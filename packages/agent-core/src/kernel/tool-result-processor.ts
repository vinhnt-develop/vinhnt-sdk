import type { RecentCall } from "./kernel-utils.js";
import { hashArgs } from "./kernel-utils.js";
import { toToolCallOutcome } from "./termination.js";
import type { ToolCallOutcome } from "./termination.js";
import type { ChatMessage } from "../model.js";
import type { ToolExecutionPlan } from "./step-executor.js";

export interface ToolResultProcessorDeps {
  readonly addSessionMessage: (sessionId: string | undefined, role: string, content: string, extra?: Record<string, unknown>) => Promise<void>;
}

export interface ToolResultProcessorResult {
  toolCallCount: number;
  recentCalls: RecentCall[];
  toolResults: ToolCallOutcome[];
  breakBatch: boolean;
}

export async function processToolResults(
  results: PromiseSettledResult<{ tc: ToolExecutionPlan; result: string; reason?: string; output?: unknown }>[],
  doomThreshold: number,
  messages: ChatMessage[],
  sessionId: string | undefined,
  runModel: { model?: string },
  existingToolCallCount: number,
  existingRecentCalls: RecentCall[],
  existingToolResults: ToolCallOutcome[],
  deps: ToolResultProcessorDeps,
): Promise<ToolResultProcessorResult> {
  let toolCallCount = existingToolCallCount;
  const recentCalls = [...existingRecentCalls];
  const toolResults = [...existingToolResults];
  let breakBatch = false;

  for (const settled of results) {
    if (settled.status === "rejected") {
      messages.push({ role: "tool", toolCallId: "", content: `Error: ${settled.reason}` });
      continue;
    }
    const r = settled.value;
    if (r.result === "doom") {
      const errorMsg = `Tool "${r.tc.toolName}" called with identical arguments ${doomThreshold} consecutive times. Aborting to prevent infinite loop.`;
      messages.push({ role: "tool", toolCallId: r.tc.toolId, content: `Error: ${errorMsg}` });
      breakBatch = true;
      break;
    }
    if (r.result === "not-found") {
      messages.push({ role: "tool", toolCallId: r.tc.toolId, content: `Error: Tool "${r.tc.toolName}" not found` });
      continue;
    }
    if (r.result === "denied") {
      messages.push({ role: "tool", toolCallId: r.tc.toolId, content: `Error: ${r.reason}` });
      continue;
    }
    if (r.result === "external") {
      messages.push({ role: "tool", toolCallId: r.tc.toolId, content: `Error: ${r.reason}` });
      continue;
    }
    if (r.result === "rejected") continue;
    if (r.result === "failed") continue;

    const outputStr = typeof r.output === "string" ? r.output : JSON.stringify(r.output);
    messages.push({ role: "tool", content: outputStr, toolCallId: r.tc.toolId });

    await deps.addSessionMessage(sessionId, "tool", outputStr, {
      toolCallId: r.tc.toolId, model: runModel.model ?? "",
    });

    toolCallCount++;
    recentCalls.push({ id: r.tc.toolName, args: r.tc.args, argsKey: hashArgs(r.tc.args) });
    toolResults.push(toToolCallOutcome(r.tc.toolName, r.output));
  }

  return { toolCallCount, recentCalls, toolResults, breakBatch };
}
