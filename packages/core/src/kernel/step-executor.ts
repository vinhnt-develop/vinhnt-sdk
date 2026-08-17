import { normalize } from "node:path";
import type { RunId, AgentConfig, RequestContext } from "@vinhnt-sdk/schema";
import { RunAbortedError } from "@vinhnt-sdk/schema";
import type { ChatMessage } from "../model.js";
import type { ToolContext, ToolDefinition } from "@vinhnt-sdk/tools";

import type { PluginManager } from "../plugin.js";
import type { PermissionGate, PermissionCheckResult } from "./permission-gate.js";
import type { RecentCall } from "./kernel-utils.js";
import { detectDoomLoop, hashArgs, DOOM_LOOP_THRESHOLD, raceWithAbort, toolDomain } from "./kernel-utils.js";
import type { ToolCallOutcome } from "./termination.js";
import { inferStepType } from "@vinhnt-sdk/schema";
import type { KnownRunEvent } from "@vinhnt-sdk/schema";
import type { ModelCaller } from "@vinhnt-sdk/model-caller";
import type { ModelProvider } from "../model.js";
import type { ToolSaga } from "@vinhnt-sdk/tool-saga";
import { buildToolContext, type MetadataRef } from "./tool-context-builder.js";
import { handleApproval as handleApprovalFn } from "./approval-handler.js";
import { handleToolError as handleToolErrorFn } from "./tool-error-router.js";
import { runSelfCorrection as runSelfCorrectionFn } from "./self-correction.js";
import { redactObjectSecrets } from "@vinhnt-sdk/security";
import { processToolResults } from "./tool-result-processor.js";

const PATH_AWARE_TOOLS = new Set(["read_file", "write_file", "edit_file", "apply_patch", "list_directory", "glob_files", "grep_files", "shell"]);

function safeEmit(store: StepExecutorDeps["store"], event: Omit<KnownRunEvent, "sequence">): void {
  try { void (store.emitEvent(event) as unknown as Promise<void>); } catch (err) { console.warn("[safeEmit] Failed to emit event:", err); }
}

function checkExternalPaths(toolName: string, args: unknown, workspaceRoot: string | undefined): string | undefined {
  if (!workspaceRoot || !PATH_AWARE_TOOLS.has(toolName)) return undefined;
  const input = args as Record<string, unknown> | undefined;
  if (!input) return undefined;
  const normalizedRoot = workspaceRoot.replace(/\\/g, "/") + "/";
  const pathCandidates = [input.filePath, input.path, input.dirPath].filter((p): p is string => typeof p === "string");
  for (const p of pathCandidates) {
    const absRaw: string = p.startsWith("/") || /^[A-Za-z]:[/\\]/.test(p) ? p : workspaceRoot + "/" + p;
    const absPath = normalize(absRaw).replace(/\\/g, "/");
    if (!absPath.startsWith(normalizedRoot)) {
      return `references path outside workspace: "${p}" (${absPath} not in ${normalizedRoot})`;
    }
  }
  return undefined;
}

export interface StepExecutorDeps {
  readonly store: { emitEvent(event: Omit<KnownRunEvent, "sequence">, persist?: boolean): Promise<void> };
  readonly addSessionMessage: (sessionId: string | undefined, role: string, content: string, extra?: Record<string, unknown>) => Promise<void>;
  readonly pluginManager: PluginManager | undefined;
  readonly permissionGate: PermissionGate;
  readonly modelCaller: ModelCaller;
  readonly maxToolCallsPerStep: number;
  readonly maxConcurrentToolCalls?: number;
  readonly maxSelfCorrectAttempts: number;
  readonly selfCorrectOnFailure: boolean;
  currentAgent: AgentConfig | undefined;
  saga: ToolSaga;
  /** Resolve the active agent for a run — used to keep parallel runs isolated. */
  readonly agentForRun?: (runId: RunId) => AgentConfig | undefined;
  /** Resolve the active saga for a run — used to keep parallel runs isolated. */
  readonly sagaForRun?: (runId: RunId) => ToolSaga;
  readonly doomLoopThreshold: number;
  readonly externalDirectoryAccess?: boolean;
  readonly workspaceRoot?: string;
  readonly findTool: (name: string, runId?: RunId) => ToolDefinition | undefined;
  readonly hasTool: (name: string) => boolean;
}

export interface ToolExecutionPlan {
  toolId: string;
  toolName: string;
  args: unknown;
}

/**
 * Executes tool calls within a run step — manages permissions, approval,
 * plugin hooks, doom-loop detection, external-path checking, concurrent
 * execution, self-correction, saga recording, and fallback strategies.
 */
export class StepExecutor {
  private readonly deps: StepExecutorDeps;

  constructor(deps: StepExecutorDeps) {
    this.deps = deps;
  }

  /** Swap the saga reference for per-run saga scoping */
  setSaga(saga: ToolSaga): void {
    this.deps.saga = saga;
  }

  /** Swap the current agent reference for per-run agent scoping */
  setCurrentAgent(agent: AgentConfig | undefined): void {
    this.deps.currentAgent = agent;
  }

  /** Get the current agent reference (used by kernel to save prev before swap) */
  getCurrentAgent(): AgentConfig | undefined {
    return this.deps.currentAgent;
  }

  /** Resolve the agent that owns the given run, falling back to the instance default. */
  private agentFor(runId: RunId): AgentConfig | undefined {
    return this.deps.agentForRun ? this.deps.agentForRun(runId) : this.deps.currentAgent;
  }

  /** Resolve the saga that owns the given run, falling back to the instance default. */
  private sagaFor(runId: RunId): ToolSaga {
    return this.deps.sagaForRun ? this.deps.sagaForRun(runId) : this.deps.saga;
  }

  private async runConcurrent<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<PromiseSettledResult<T>[]> {
    const results: PromiseSettledResult<T>[] = new Array(tasks.length);
    const running: Promise<void>[] = [];
    let idx = 0;

    const exec = async (i: number): Promise<void> => {
      const task = tasks[i];
      if (!task) return;
      try {
        results[i] = { status: "fulfilled", value: await task() };
      } catch (e) {
        results[i] = { status: "rejected", reason: e };
      }
    };

    const next = (): Promise<void> => {
      if (idx >= tasks.length) return Promise.resolve();
      const i = idx++;
      const p = exec(i).then(next);
      running.push(p);
      if (running.length >= concurrency) {
        return Promise.race(running).then(() => Promise.resolve());
      }
      return next();
    };

    await next();
    await Promise.allSettled(running);
    return results;
  }

  /**
   * Execute a batch of tool calls for the current step.
   * Handles permission gating, approval dialogs, plugin hooks, doom-loop
   * detection, external-path checks, concurrent execution with configurable
   * concurrency, self-correction on failure, and saga compensation recording.
   */
  async executeToolCalls(
    toolCalls: ToolExecutionPlan[],
    messages: ChatMessage[],
    step: number,
    runId: RunId,
    ctx: RequestContext,
    runAbort: AbortController,
    sessionId: string | undefined,
    runModel: ModelProvider,
  ): Promise<{ toolCallCount: number; recentCalls: RecentCall[]; selfCorrectTokens: { input: number; output: number }; toolResults: ToolCallOutcome[] }> {
    const selfCorrectTokens = { input: 0, output: 0 };
    let toolCallCount = 0;
    const recentCalls: RecentCall[] = [];
    const toolResults: ToolCallOutcome[] = [];
    const limit = this.deps.maxToolCallsPerStep;

    for (let batchStart = 0; batchStart < toolCalls.length && !runAbort.signal.aborted && toolCallCount < limit; batchStart += limit) {
      const batch = toolCalls.slice(batchStart, Math.min(batchStart + limit, toolCalls.length));

      // Filter out doom-loop tools from the concurrent batch
      const doomThreshold = this.deps.doomLoopThreshold ?? DOOM_LOOP_THRESHOLD;
      const doomResult: { tc: ToolExecutionPlan; result: "doom" }[] = [];
      const batchIdentical = new Map<string, number>();
      const execBatch = batch.filter((tc) => {
        const argsKey = hashArgs(tc.args);
        const key = `${tc.toolName}:${argsKey}`;
        const prevCount = recentCalls.filter((r) => r.id === tc.toolName && (r.argsKey ?? hashArgs(r.args)) === argsKey).length;
        const totalSoFar = prevCount + (batchIdentical.get(key) ?? 0);
        if (totalSoFar >= doomThreshold) {
          doomResult.push({ tc, result: "doom" as const });
          safeEmit(this.deps.store, {
            id: crypto.randomUUID(), runId, type: "tool.failed",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: { toolId: tc.toolId, toolName: tc.toolName, domain: toolDomain(tc.toolName), error: `Doom loop: "${tc.toolName}" called ${this.deps.doomLoopThreshold}x with identical args` },
          });
          return false;
        }
        batchIdentical.set(key, (batchIdentical.get(key) ?? 0) + 1);
        return true;
      });

      const tasks = execBatch.map((tc) => async () => {
        if (detectDoomLoop(recentCalls, tc.toolName, tc.args, doomThreshold)) {
          safeEmit(this.deps.store, {
            id: crypto.randomUUID(), runId, type: "tool.failed",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: { toolId: tc.toolId, toolName: tc.toolName, domain: toolDomain(tc.toolName), error: `Doom loop: "${tc.toolName}" called ${doomThreshold}x with identical args` },
          });
          return { tc, result: "doom" as const };
        }

        if (this.deps.externalDirectoryAccess !== true && this.deps.workspaceRoot) {
          const externalPath = checkExternalPaths(tc.toolName, tc.args, this.deps.workspaceRoot);
          if (externalPath) {
            safeEmit(this.deps.store, {
              id: crypto.randomUUID(), runId, type: "tool.failed",
              occurredAt: new Date().toISOString(), traceId: ctx.traceId,
              data: { toolId: tc.toolId, toolName: tc.toolName, domain: toolDomain(tc.toolName), error: `External directory: ${externalPath}` },
            });
            return { tc, result: "external" as const, reason: `External directory: ${externalPath}` };
          }
        }

        const tool = this.deps.findTool(tc.toolName, runId);
        if (!tool) {
          const registered = this.deps.hasTool(tc.toolName);
          safeEmit(this.deps.store, {
            id: crypto.randomUUID(), runId, type: "tool.failed",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: {
              toolId: tc.toolId, toolName: tc.toolName,
              domain: toolDomain(tc.toolName),
              ...(registered ? { decision: "deny" as const } : {}),
              error: registered
                ? `Tool "${tc.toolName}" not found (denied by policy)`
                : `Tool "${tc.toolName}" not found`,
            },
          });
          return { tc, result: "not-found" as const };
        }

        // P1-F: onBeforeToolExecution fired below — right before tool.execute.
        const permResult = this.deps.permissionGate.checkTool(
          tc.toolName, tool.risk, tc.args as Record<string, unknown>, this.agentFor(runId),
        );
        if (!permResult.allowed && !permResult.needsApproval) {
          safeEmit(this.deps.store, {
            id: crypto.randomUUID(), runId, type: "tool.failed",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: { toolId: tc.toolId, toolName: tc.toolName, domain: toolDomain(tc.toolName), decision: "deny", error: permResult.reason! },
          });
          return { tc, result: "denied" as const, reason: permResult.reason! };
        }

        const compensationRef: { current: (() => Promise<void>) | null } = { current: null };
        const metadataRef: MetadataRef = { };
        const toolCtx = await this.buildToolContext(tc, runId, sessionId, ctx, runAbort, tool, compensationRef, metadataRef);
        const approved = await this.handleApproval(permResult, tc, toolCtx, runId, ctx, sessionId, messages, tool.selfApproving);
        if (!approved) return { tc, result: "rejected" as const };

        safeEmit(this.deps.store, {
          id: crypto.randomUUID(), runId, type: "step.type_changed",
          occurredAt: new Date().toISOString(), traceId: ctx.traceId,
          data: { stepType: inferStepType(tc.toolName), stepNumber: step, toolName: tc.toolName },
        });

        safeEmit(this.deps.store, {
          id: crypto.randomUUID(), runId, type: "tool.invoked",
          occurredAt: new Date().toISOString(), traceId: ctx.traceId,
          data: { toolId: tc.toolId, toolName: tc.toolName, domain: toolDomain(tc.toolName), decision: "allow", input: tc.args },
        });

        const invHookResult = await this.deps.pluginManager?.fireHook("onToolInvoked", {
          toolId: tc.toolId, toolName: tc.toolName, input: tc.args,
        });
        const effectiveInput = invHookResult?.modified?.input ?? tc.args;

        // P1-F: onBeforeToolExecution — intercept/modify input right before execution.
        const beforeExecResult = await this.deps.pluginManager?.fireHook("onBeforeToolExecution", {
          toolId: tc.toolId, toolName: tc.toolName, input: effectiveInput,
        });
        const execInput = beforeExecResult?.modified?.input ?? effectiveInput;

        // Re-validate permission if the execution hook modified the input further.
        if (execInput !== effectiveInput) {
          const rePerm = this.deps.permissionGate.checkTool(
            tc.toolName, tool.risk, execInput as Record<string, unknown>, this.agentFor(runId),
          );
          if (!rePerm.allowed && !rePerm.needsApproval) {
            safeEmit(this.deps.store, {
              id: crypto.randomUUID(), runId, type: "tool.failed",
              occurredAt: new Date().toISOString(), traceId: ctx.traceId,
              data: { toolId: tc.toolId, toolName: tc.toolName, domain: toolDomain(tc.toolName), decision: "deny", error: `Plugin-modified input rejected: ${rePerm.reason}` },
            });
            return { tc, result: "denied" as const, reason: rePerm.reason! };
          }
        }

        const toolTimeout = tool.timeoutMs;
        const execPromise = toolTimeout
          ? Promise.race([
              tool.execute(execInput, toolCtx),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Tool "${tc.toolName}" timed out after ${toolTimeout}ms`)), toolTimeout)),
            ])
          : tool.execute(execInput, toolCtx);

        try {
          const output = await raceWithAbort(execPromise, runAbort.signal, runId);

          // P1-F: onAfterToolExecution — intercept/modify the raw tool output.
          const afterExecResult = await this.deps.pluginManager?.fireHook("onAfterToolExecution", {
            toolId: tc.toolId, toolName: tc.toolName, output,
          });
          const execOutput = afterExecResult?.modified?.output ?? output;

          const compHookResult = await this.deps.pluginManager?.fireHook("onToolCompleted", {
            toolId: tc.toolId, toolName: tc.toolName, output: execOutput,
          });
          const effectiveOutput = compHookResult?.modified?.output ?? execOutput;

          this.sagaFor(runId).record({
            toolId: tc.toolId, toolName: tc.toolName,
            input: effectiveInput, output: effectiveOutput,
            timestamp: Date.now(), step,
          });

          if (compensationRef.current) {
            this.sagaFor(runId).registerCompensation(tc.toolId, {
              entry: { toolId: tc.toolId, toolName: tc.toolName, input: effectiveInput, output: effectiveOutput, timestamp: Date.now(), step },
              compensate: compensationRef.current,
            });
          }

          safeEmit(this.deps.store, {
            id: crypto.randomUUID(), runId, type: "tool.completed",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: {
              toolId: tc.toolId, toolName: tc.toolName, domain: toolDomain(tc.toolName),
              output: effectiveOutput,
              ...(metadataRef.current ? { metadata: metadataRef.current } : {}),
            },
          });

          return { tc, result: "success" as const, output: effectiveOutput };
        } catch (err) {
          if (!(err instanceof RunAbortedError)) {
            // P1-N: never log raw tool args — they may contain apiKeys/secrets.
            console.error("[step-executor] Tool execution error", { toolId: tc.toolId, toolName: tc.toolName, error: err instanceof Error ? err.message : String(err), input: redactObjectSecrets(tc.args) });
          }
          await handleToolErrorFn(err, tc, tool, messages, step, runId, ctx, runAbort, toolCtx, sessionId, recentCalls, runModel, {
            store: this.deps.store,
            addSessionMessage: this.deps.addSessionMessage,
            pluginManager: this.deps.pluginManager,
            permissionGate: this.deps.permissionGate,
            selfCorrectOnFailure: this.deps.selfCorrectOnFailure,
            externalDirectoryAccess: this.deps.externalDirectoryAccess,
            workspaceRoot: this.deps.workspaceRoot,
            findTool: this.deps.findTool,
            currentAgent: this.agentFor(runId),
            runSelfCorrection: (tc, messages, recentCalls, step, runId, ctx, runAbort, toolCtx, errorMsg, runModel) =>
              this.runSelfCorrection(tc, messages, recentCalls, step, runId, ctx, runAbort, toolCtx, errorMsg, runModel, selfCorrectTokens),
          });
          await this.sagaFor(runId).rollbackStep(step);
          return { tc, result: "failed" as const };
        }
      });

      const concurrency = this.deps.maxConcurrentToolCalls ?? 5;
      const results = await this.runConcurrent(tasks, concurrency);
      if (runAbort.signal.aborted) break;

      // Process pre-identified doom loops after batch execution
      if (doomResult.length > 0) {
        const doom = doomResult[0]!;
        const errorMsg = `Tool "${doom.tc.toolName}" called with identical arguments ${doomThreshold} consecutive times. Aborting to prevent infinite loop.`;
        messages.push({ role: "tool", toolCallId: doom.tc.toolId, content: `Error: ${errorMsg}` });
        break;
      }

      const processed = await processToolResults(results, doomThreshold, messages, sessionId, { model: runModel.model }, toolCallCount, recentCalls, toolResults, {
        addSessionMessage: this.deps.addSessionMessage,
      });
      toolCallCount = processed.toolCallCount;
      recentCalls.length = 0;
      recentCalls.push(...processed.recentCalls);
      toolResults.length = 0;
      toolResults.push(...processed.toolResults);
      if (processed.breakBatch) break;
    }

    return { toolCallCount, recentCalls, selfCorrectTokens, toolResults };
  }

  private async buildToolContext(
    tc: ToolExecutionPlan, runId: RunId, sessionId: string | undefined,
    ctx: RequestContext, runAbort: AbortController, tool: ToolDefinition,
    compensationRef: { current: (() => Promise<void>) | null },
    metadataRef: MetadataRef,
  ): Promise<ToolContext> {
    return buildToolContext(tc, runId, sessionId, ctx, runAbort, compensationRef, metadataRef, {
      pluginManager: this.deps.pluginManager,
      permissionGate: this.deps.permissionGate,
      currentAgent: this.agentFor(runId),
      toolRisk: tool.risk,
    });
  }

  private async handleApproval(
    permResult: PermissionCheckResult, tc: ToolExecutionPlan, toolCtx: ToolContext,
    runId: RunId, ctx: RequestContext, _sessionId: string | undefined,
    messages: ChatMessage[], selfApproving?: boolean,
  ): Promise<boolean> {
    return handleApprovalFn(permResult, tc, toolCtx, runId, ctx, _sessionId, messages, {
      store: this.deps.store,
      permissionGate: this.deps.permissionGate,
      pluginManager: this.deps.pluginManager,
      currentAgent: this.agentFor(runId),
    }, selfApproving);
  }

  private async runSelfCorrection(
    tc: ToolExecutionPlan, messages: ChatMessage[], recentCalls: RecentCall[],
    step: number, runId: RunId, ctx: RequestContext,
    runAbort: AbortController, toolCtx: ToolContext, errorMsg: string,
    runModel: ModelProvider,
    selfCorrectTokens: { input: number; output: number },
  ): Promise<void> {
    return runSelfCorrectionFn(tc, messages, recentCalls, step, runId, ctx, runAbort, toolCtx, errorMsg, runModel, {
      store: this.deps.store,
      modelCaller: this.deps.modelCaller,
      maxSelfCorrectAttempts: this.deps.maxSelfCorrectAttempts,
      doomLoopThreshold: this.deps.doomLoopThreshold,
      findTool: this.deps.findTool,
      permissionGate: this.deps.permissionGate,
      pluginManager: this.deps.pluginManager,
      currentAgent: this.agentFor(runId),
    }, selfCorrectTokens);
  }
}
