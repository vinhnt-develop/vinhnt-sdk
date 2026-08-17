import type { RunId, RequestContext, AgentConfig } from "@vinhnt-sdk/schema";
import { getTextContent } from "@vinhnt-sdk/schema";
import type { ChatMessage } from "@vinhnt-sdk/schema";
import type { ToolContext } from "@vinhnt-sdk/tools";
import type { RecentCall } from "./kernel-utils.js";
import { detectDoomLoop, SELF_CORRECT_PROMPT, raceWithAbort } from "./kernel-utils.js";
import { RunAbortedError } from "@vinhnt-sdk/schema";
import type { ToolExecutionPlan } from "./step-executor.js";
import type { ModelCaller } from "@vinhnt-sdk/model-caller";
import type { ModelProvider } from "@vinhnt-sdk/schema";
import type { StepExecutorPluginHooks } from "./hooks.js";
import type { PermissionGate } from "./permission-gate.js";

export interface SelfCorrectionDeps {
  readonly store: { emitEvent(event: Omit<import("@vinhnt-sdk/schema").KnownRunEvent, "sequence">, persist?: boolean): Promise<void> };
  readonly modelCaller: ModelCaller;
  readonly maxSelfCorrectAttempts: number;
  readonly doomLoopThreshold: number;
  readonly findTool: (name: string, runId?: RunId) => import("@vinhnt-sdk/tools").ToolDefinition | undefined;
  readonly permissionGate: PermissionGate;
  readonly pluginManager: StepExecutorPluginHooks | undefined;
  currentAgent: AgentConfig | undefined;
}

export interface SelfCorrectionTokens {
  input: number;
  output: number;
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
          if (detectDoomLoop(recentCalls, ct.name, ct.args, deps.doomLoopThreshold)) {
            messages.push({ role: "tool", toolCallId: ct.id, content: `Error: Doom loop detected in self-correction for "${ct.name}"` });
            corrected = true;
            break;
          }
          const ctool = deps.findTool(ct.name, runId);
          if (!ctool) {
            messages.push({ role: "tool", toolCallId: ct.id, content: `Error: Tool "${ct.name}" not found` });
            continue;
          }
          const cpermResult = deps.permissionGate.checkTool(ct.name, ctool.risk, undefined, deps.currentAgent);
          if (!cpermResult.allowed && !cpermResult.needsApproval) {
            messages.push({ role: "tool", toolCallId: ct.id, content: `Error: ${cpermResult.reason}` });
            continue;
          }
          try {
            const cExec = ctool.timeoutMs
              ? Promise.race([
                  ctool.execute(ct.args, toolCtx),
                  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Tool "${ct.name}" timed out after ${ctool.timeoutMs}ms`)), ctool.timeoutMs)),
                ])
              : ctool.execute(ct.args, toolCtx);
            const coutput = await raceWithAbort(cExec, runAbort.signal, runId);
            messages.push({
              role: "tool",
              content: typeof coutput === "string" ? coutput : JSON.stringify(coutput),
              toolCallId: ct.id,
            });
            corrected = true;
          } catch (cErr) {
            if (cErr instanceof RunAbortedError) throw cErr;
            messages.push({ role: "tool", toolCallId: ct.id, content: `Error: ${cErr instanceof Error ? cErr.message : String(cErr)}` });
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
