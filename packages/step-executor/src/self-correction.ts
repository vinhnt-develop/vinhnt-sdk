import type { RunId, RequestContext, AgentConfig } from "@vinhnt-sdk/schema";
import { getTextContent } from "@vinhnt-sdk/schema";
import type { ChatMessage } from "@vinhnt-sdk/schema";
import type { ToolContext } from "@vinhnt-sdk/tools";
import type { RecentCall } from "./kernel-utils.js";
import { detectDoomLoop, SELF_CORRECT_PROMPT, raceWithAbort, withToolTimeout, toolDomain } from "./kernel-utils.js";
import { resolveLoopPolicy, type LoopDetectionConfig } from "./loop-policy.js";
import { RunAbortedError } from "@vinhnt-sdk/schema";
import type { ToolExecutionPlan } from "./step-executor.js";
import type { ModelCaller } from "@vinhnt-sdk/llm";
import type { ModelProvider } from "@vinhnt-sdk/schema";
import type { StepExecutorPluginHooks } from "./hooks.js";
import type { PermissionGate } from "./permission-gate.js";
import { formatToolFailure } from "@vinhnt-sdk/schema";

/** Dependencies required by {@link runSelfCorrection}. */
export interface SelfCorrectionDeps {
  readonly store: { emitEvent(event: Omit<import("@vinhnt-sdk/schema").KnownRunEvent, "sequence">, persist?: boolean): Promise<void> };
  readonly modelCaller: ModelCaller;
  readonly maxSelfCorrectAttempts: number;
  readonly doomLoopThreshold: number;
  /** P1-3: config-driven doom-loop policy for self-correction retries. */
  readonly loopDetection?: LoopDetectionConfig;
  readonly findTool: (name: string, runId?: RunId) => import("@vinhnt-sdk/tools").ToolDefinition | undefined;
  readonly permissionGate: PermissionGate;
  readonly pluginManager: StepExecutorPluginHooks | undefined;
  currentAgent: AgentConfig | undefined;
}

/** Token accumulator for a self-correction pass. */
export interface SelfCorrectionTokens {
  input: number;
  output: number;
}

/** Emit a run event without letting observability failures break correction. */
async function safeEmit(
  store: SelfCorrectionDeps["store"],
  event: Omit<import("@vinhnt-sdk/schema").KnownRunEvent, "sequence">,
): Promise<void> {
  try {
    await store.emitEvent(event);
  } catch {
    /* event emission is best-effort */
  }
}

export async function runSelfCorrection(
  tc: ToolExecutionPlan,
  messages: ChatMessage[],
  recentCalls: RecentCall[],
  step: number,
  runId: RunId,
  ctx: RequestContext,
  runAbort: AbortController,
  toolCtx: ToolContext,
  errorMsg: string,
  runModel: ModelProvider,
  deps: SelfCorrectionDeps,
  selfCorrectTokens: SelfCorrectionTokens,
): Promise<void> {
  let corrected = false;
  for (let attempt = 1; attempt <= deps.maxSelfCorrectAttempts; attempt++) {
    await deps.store.emitEvent({
      id: crypto.randomUUID(), runId, type: "tool.self_correcting",
      occurredAt: new Date().toISOString(), traceId: ctx.traceId,
      data: { toolId: tc.toolId, toolName: tc.toolName, error: errorMsg, attempt },
    });

    try {
      const correction = await deps.modelCaller.callModelStream(
        [...messages, { role: "system", content: SELF_CORRECT_PROMPT }],
        step, runId, ctx, runAbort.signal,
        deps.currentAgent?.permissions?.maxTokens,
      );

      if (correction.content && runModel?.countTokens) {
        selfCorrectTokens.input += [...messages, { role: "system", content: SELF_CORRECT_PROMPT }]
          .reduce((sum, m) => sum + runModel.countTokens!(getTextContent(m.content)), 0);
        selfCorrectTokens.output += runModel.countTokens(correction.content);
      }

      if (correction.toolCalls?.length) {
        messages.push({
          role: "assistant", content: correction.content,
          toolCalls: correction.toolCalls.map((ct) => ({
            id: ct.id, name: ct.name, args: ct.args as Record<string, unknown>,
          })),
        });

        for (const ct of correction.toolCalls) {
          if (runAbort.signal.aborted) break;
          const loopPolicy = resolveLoopPolicy(deps.loopDetection, ct.name, deps.doomLoopThreshold);
          if (loopPolicy.enabled && loopPolicy.action !== "allow" && detectDoomLoop(recentCalls, ct.name, ct.args, loopPolicy.threshold)) {
            if (loopPolicy.action === "ask" && !deps.permissionGate.isDoomLoopBypassed?.(ct.name)) {
              const doomReason = `Doom loop in self-correction for "${ct.name}" (${loopPolicy.threshold}x identical). Allow?`;
              const doomReply = await deps.permissionGate.askForTool(
                ct.name, ct.id, runId, "", doomReason,
                deps.currentAgent?.id ?? "", ctx.traceId, deps.pluginManager,
                undefined, runAbort.signal,
                { forceAsk: true, permissionKey: "doom_loop" },
              );
              if (doomReply !== "reject") {
                // once / always → fall through and attempt the corrected call
              } else {
                messages.push({ role: "tool", toolCallId: ct.id, content: formatToolFailure(`Error: Doom loop detected in self-correction for "${ct.name}" (rejected by user)`, undefined, "doom_loop") });
                corrected = true;
                break;
              }
            } else if (loopPolicy.action === "inject-hint") {
              messages.push({ role: "tool", toolCallId: ct.id, content: formatToolFailure(`Error: Doom loop detected in self-correction for "${ct.name}" — change the approach`, undefined, "doom_loop") });
              corrected = true;
              break;
            } else {
              messages.push({ role: "tool", toolCallId: ct.id, content: formatToolFailure(`Error: Doom loop detected in self-correction for "${ct.name}"`, undefined, "doom_loop") });
              corrected = true;
              break;
            }
          }
          const ctool = deps.findTool(ct.name, runId);
          if (!ctool) {
            messages.push({ role: "tool", toolCallId: ct.id, content: `Error: Tool "${ct.name}" not found` });
            continue;
          }
          const cpermResult = deps.permissionGate.checkTool(ct.name, ctool.risk, ct.args as Record<string, unknown> | undefined, deps.currentAgent);
          if (!cpermResult.allowed && !cpermResult.needsApproval) {
            messages.push({ role: "tool", toolCallId: ct.id, content: formatToolFailure(cpermResult.reason ?? `Tool "${ct.name}" requires approval for self-correction`, undefined, "permission_denied") });
            continue;
          }
          if (cpermResult.needsApproval) {
            if (!deps.permissionGate.checkSavedApproval(ct.name, ct.args as Record<string, unknown> | undefined, deps.currentAgent?.id)) {
              const reply = await deps.permissionGate.askForTool(
                ct.name, ct.id, runId, "",
                cpermResult.reason ?? `Tool "${ct.name}" requires approval for self-correction`,
                deps.currentAgent?.id ?? "", ctx.traceId, deps.pluginManager,
                undefined, runAbort.signal,
              );
              if (reply === "reject") {
                messages.push({ role: "tool", toolCallId: ct.id, content: `Error: Tool "${ct.name}" rejected by user` });
                continue;
              }
            }
          }
          // Emit tool.invoked/completed/failed around the corrected call so
          // trajectory, tool_executions and WS clients observe it (it used to
          // run silently — invisible to every consumer).
          await safeEmit(deps.store, {
            id: crypto.randomUUID(), runId, type: "tool.invoked",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: { toolId: ct.id, toolName: ct.name, domain: toolDomain(ct.name), decision: "allow", input: ct.args as Record<string, unknown> },
          });
          try {
            // RV-19: cooperative timeout — signal the correction tool at the
            // deadline so its side effects stop, not just race-and-abandon.
            const cExec = ctool.timeoutMs
              ? withToolTimeout(
                  (signal) => ctool.execute(ct.args, { ...toolCtx, signal }),
                  ctool.timeoutMs,
                  runAbort.signal,
                  `Tool "${ct.name}" timed out after ${ctool.timeoutMs}ms`,
                )
              : ctool.execute(ct.args, toolCtx);
            const coutput = await raceWithAbort(cExec, runAbort.signal, runId);
            messages.push({
              role: "tool",
              content: typeof coutput === "string" ? coutput : JSON.stringify(coutput),
              toolCallId: ct.id,
            });
            await safeEmit(deps.store, {
              id: crypto.randomUUID(), runId, type: "tool.completed",
              occurredAt: new Date().toISOString(), traceId: ctx.traceId,
              data: { toolId: ct.id, toolName: ct.name, domain: toolDomain(ct.name), output: coutput },
            });
            corrected = true;
          } catch (cErr) {
            if (cErr instanceof RunAbortedError) throw cErr;
            const errMsg = cErr instanceof Error ? cErr.message : String(cErr);
            messages.push({ role: "tool", toolCallId: ct.id, content: `Error: ${errMsg}` });
            await safeEmit(deps.store, {
              id: crypto.randomUUID(), runId, type: "tool.failed",
              occurredAt: new Date().toISOString(), traceId: ctx.traceId,
              data: { toolId: ct.id, toolName: ct.name, domain: toolDomain(ct.name), error: errMsg },
            });
          }
        }
      } else if (correction.content) {
        messages.push({ role: "assistant", content: correction.content });
        corrected = true;
      }
    } catch (err) {
      console.warn(`[kernel] Self-correction attempt ${attempt}/${deps.maxSelfCorrectAttempts} failed:`, err instanceof Error ? err.message : String(err));
    }
    if (corrected) break;
  }

  if (!corrected) {
    console.warn(`[kernel] Self-correction exhausted after ${deps.maxSelfCorrectAttempts} attempts for tool "${tc.toolName}"`);
  }
}
