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
  /**
   * Max chars of a single tool output the MODEL sees per call (head+tail kept).
   * The full (redacted) output is still persisted to the session for the UI.
   * Default: {@link DEFAULT_MAX_LIVE_TOOL_OUTPUT_CHARS}.
   */
  readonly maxToolOutputChars?: number;
}

/** Hard cap for one tool output pushed into model context (safety net vs. giant dumps). */
export const DEFAULT_MAX_LIVE_TOOL_OUTPUT_CHARS = 100_000;

/**
 * Head+tail truncation with an omission marker. Keeps the most relevant parts
 * (start of output + end, where errors usually land) within a bounded cost.
 */
export function truncateToolOutput(text: string, maxChars: number): string {
  if (maxChars <= 0 || text.length <= maxChars) return text;
  const head = Math.ceil(maxChars * 0.7);
  const tail = maxChars - head;
  const omitted = text.length - head - tail;
  return `${text.slice(0, head)}\n[... ${omitted} chars truncated — full output saved to session ...]\n${text.slice(text.length - tail)}`;
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
      const errorMsg = r.reason ?? `Tool "${r.tc.toolName}" called with identical arguments ${doomThreshold} consecutive times. Aborting to prevent infinite loop.`;
      messages.push({ role: "tool", toolCallId: r.tc.toolId, content: formatToolFailure(errorMsg, undefined, "doom_loop") });
      breakBatch = true;
      break;
    }
    if (r.result === "doom-hint") {
      // P1-3 inject-hint: surface a model-visible envelope WITHOUT aborting the batch.
      const hintMsg = r.reason ?? `Tool "${r.tc.toolName}" repeated with identical arguments ${doomThreshold} times.`;
      messages.push({ role: "tool", toolCallId: r.tc.toolId, content: formatToolFailure(hintMsg, undefined, "doom_loop") });
      continue;
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
    // Persist the FULL (redacted) output for the trajectory/UI…
    await deps.addSessionMessage(sessionId, "tool", outputStr, {
      toolCallId: r.tc.toolId, model: runModel.model ?? "",
    });
    // …but only a bounded view enters model context.
    const liveCap = deps.maxToolOutputChars ?? DEFAULT_MAX_LIVE_TOOL_OUTPUT_CHARS;
    messages.push({ role: "tool", content: truncateToolOutput(outputStr, liveCap), toolCallId: r.tc.toolId });

    toolCallCount++;
    recentCalls.push({ id: r.tc.toolName, args: r.tc.args, argsKey: hashArgs(r.tc.args) });
    toolResults.push(toToolCallOutcome(r.tc.toolName, r.output));
  }

  return { toolCallCount, recentCalls, toolResults, breakBatch };
}
