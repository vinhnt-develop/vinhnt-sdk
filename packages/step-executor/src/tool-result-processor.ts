import type { RecentCall } from "./kernel-utils.js";
import { hashArgs } from "./kernel-utils.js";
import { toToolCallOutcome } from "./termination.js";
import type { ToolCallOutcome } from "./termination.js";
import type { ChatMessage } from "@vinhnt-sdk/schema";
import { formatToolFailure } from "@vinhnt-sdk/schema";
import { redactSecrets } from "@vinhnt-sdk/guard";
import type { ToolExecutionPlan } from "./step-executor.js";

/** Dependencies required by {@link processToolResults}. */
export interface ToolResultProcessorDeps {
  readonly addSessionMessage: (sessionId: string | undefined, role: string, content: string, extra?: Record<string, unknown>) => Promise<void>;
  /** P1-7: scrub secrets from tool outputs before persist/send. Default true when omitted. */
  readonly redactToolOutputs?: boolean;
}

/** Aggregated outcome of processing a batch of tool results. */
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
      const reasonStr = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
      messages.push({ role: "tool", toolCallId: "", content: formatToolFailure(reasonStr) });
      continue;
    }
    const r = settled.value;
    if (r.result === "doom") {
      const errorMsg = `Tool "${r.tc.toolName}" called with identical arguments ${doomThreshold} consecutive times. Aborting to prevent infinite loop.`;
      messages.push({ role: "tool", toolCallId: r.tc.toolId, content: formatToolFailure(errorMsg, undefined, "doom_loop") });
      breakBatch = true;
      break;
    }
    if (r.result === "not-found") {
      messages.push({ role: "tool", toolCallId: r.tc.toolId, content: formatToolFailure(`Tool "${r.tc.toolName}" not found`, undefined, "unknown") });
      continue;
    }
    if (r.result === "denied") {
      messages.push({ role: "tool", toolCallId: r.tc.toolId, content: formatToolFailure(r.reason ?? "denied", undefined, "permission_denied") });
      continue;
    }
    if (r.result === "external") {
      messages.push({ role: "tool", toolCallId: r.tc.toolId, content: formatToolFailure(r.reason ?? "external path forbidden", undefined, "path_forbidden") });
      continue;
    }
    if (r.result === "rejected") continue;
    if (r.result === "failed") continue;

    let outputStr = typeof r.output === "string" ? r.output : JSON.stringify(r.output);
    // P1-7: redact secrets before the model/trajectory sees the output.
    if (deps.redactToolOutputs !== false) {
      outputStr = redactSecrets(outputStr);
    }
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
