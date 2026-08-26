import type { RequestContext, RunId, AgentConfig, ContentPart } from "@vinhnt-sdk/schema";
import { getTextContent, COMPACTION_SUMMARY_PREFIX } from "@vinhnt-sdk/schema";
import type { ChatMessage, MessageContentPart, ModelProvider, ModelResponse } from "../model.js";
import type { ContextRegistry } from "../system-context/types.js";
import type { ConversationCompactor } from "@vinhnt-sdk/session";
import type { RunEventStore, SessionStore } from "@vinhnt-sdk/session";
import type { PluginManager } from "../plugin.js";
import type { SessionRuntimeState } from "@vinhnt-sdk/session";
import { KernelError } from "@vinhnt-sdk/step-executor";
import type { ModelCaller } from "@vinhnt-sdk/llm";
import type { PermissionGate } from "@vinhnt-sdk/step-executor";
import type { StepExecutor } from "@vinhnt-sdk/step-executor";
import type { ToolSaga } from "@vinhnt-sdk/tools";
import type { CircuitBreaker, CircuitBreakerOpenError } from "@vinhnt-sdk/step-executor";
import type { RunStateMachine } from "@vinhnt-sdk/step-executor";
import { evaluateStopConditions, buildJudgeMessages, parseJudgeVerdict } from "@vinhnt-sdk/step-executor";
import type { StopCondition, StepVerificationContext, TerminationPolicy, ToolCallOutcome } from "@vinhnt-sdk/step-executor";

export interface RunLoopDeps {
  readonly modelCaller: ModelCaller;
  readonly permissionGate: PermissionGate;
  readonly stepExecutor: StepExecutor;
  readonly saga: ToolSaga;
  readonly store: RunEventStore;
  readonly circuitBreaker: CircuitBreaker;
  readonly stateMachine: RunStateMachine;
  readonly pluginManager?: PluginManager;
  readonly systemContext?: ContextRegistry;
  readonly compactor?: ConversationCompactor;
  readonly sessionStore?: SessionStore;
  readonly sessionTitleGenerator?: (prompt: string) => Promise<string>;
  readonly addSessionMessage: (sid: string | undefined, role: string, content: string, extra?: Record<string, unknown> | undefined) => Promise<void>;
  readonly maxSteps: number;
  readonly maxTokens: number;
  readonly thinkingBudget: number;
  readonly stepTimeout: number;
  readonly compactionThreshold?: number;
  readonly currentAgent?: AgentConfig;
  readonly termination?: TerminationPolicy;
  /** Optional judge model for `llm-judge` stop conditions (defaults to the active run model). */
  readonly judgeModel?: ModelProvider;
  /** Await once before the loop starts, e.g. re-queuing persisted pending inputs (RV-21). */
  readonly beforeRun?: (runId: RunId) => Promise<void> | void;
  /** Called with the texts drained from the input queue after a step drains it (RV-21). */
  readonly onInputsDrained?: (runId: RunId, texts: string[]) => Promise<void> | void;
}

export interface RunLoopInput {
  prompt: string;
  /** Real system head (agent identity + agent system prompt). Kept separate so
   * the conversation sent to the model has a proper `system` message instead of
   * flattening identity/system instructions into the user turn (RV-40). */
  systemPrompt?: string;
  runId: RunId;
  ctx: RequestContext;
  runAbort: AbortController;
  sessionId?: string;
  userContentParts?: readonly { type: string; text?: string; image?: string; mimeType?: string }[];
  runModel: ModelProvider;
  runSessionState?: SessionRuntimeState;
  addSessionMessage: (sid: string | undefined, role: string, content: string, extra?: Record<string, unknown>) => Promise<void>;
  emitEvent: (event: { id: string; runId: RunId; type: string; occurredAt: string; traceId: string; data: Record<string, unknown> }, persist?: boolean) => Promise<void>;
  setState: (runId: RunId, state: string) => void;
  /** Atomically (when supported) persist `run.completed` + session terminal stats. */
  emitCompleted: (event: { id: string; runId: RunId; type: string; occurredAt: string; traceId: string; data: Record<string, unknown> }, sessionId: string | undefined, runId: RunId, totalInputTokens: number, totalOutputTokens: number, status: string) => Promise<void>;
  emitFail: (runId: RunId, ctx: RequestContext, reason: string, steps: number, sessionId?: string, totalInputTokens?: number, totalOutputTokens?: number, durationMs?: number, cancelled?: boolean) => Promise<void>;
  /** If true, resuming from durable storage — skip run.started event and user prompt injection. */
  resume?: boolean;
}

export type RunLoopStatus = "succeeded" | "failed" | "cancelled";

export interface RunLoopResult {
  readonly totalSteps: number;
  readonly status: RunLoopStatus;
}

// ---------------------------------------------------------------------------
// System context
// ---------------------------------------------------------------------------

interface SystemContextResult {
  messages: ChatMessage[];
  contextEpochActive: boolean;
  didChange: boolean;
}

/** Index of the head `system` message — the first one. All system instructions
 * (identity, agent systemPrompt, context baseline/reconciled updates) must live
 * in that single message so providers never see mid-conversation `system`
 * messages (RV-40). */
function headSystemIndex(messages: ChatMessage[]): number {
  return messages.findIndex((m) => m.role === "system");
}

async function initializeSystemContext(
  systemContext: ContextRegistry,
  messages: ChatMessage[],
): Promise<SystemContextResult> {
  const sc = await systemContext.initialize();
  if (sc.baseline) {
    const idx = headSystemIndex(messages);
    if (idx >= 0) {
      const updated = [...messages];
      const head = updated[idx]!;
      updated[idx] = { ...head, content: `${getTextContent(head.content)}\n\n${sc.baseline}` };
      return { messages: updated, contextEpochActive: true, didChange: true };
    }
    return { messages: [{ role: "system", content: sc.baseline }, ...messages], contextEpochActive: true, didChange: true };
  }
  return { messages, contextEpochActive: true, didChange: false };
}

async function reconcileSystemContext(
  systemContext: ContextRegistry,
  messages: ChatMessage[],
  step: number,
): Promise<SystemContextResult> {
  const result = await systemContext.reconcile();
  if (result.type === "updated" && result.update) {
    // Merge the update into the head system message rather than appending a new
    // mid-conversation `system` message that providers may reject or mis-handle.
    const idx = headSystemIndex(messages);
    if (idx >= 0) {
      const updated = [...messages];
      const head = updated[idx]!;
      updated[idx] = { ...head, content: `${getTextContent(head.content)}\n\n${result.update}` };
      return { messages: updated, contextEpochActive: true, didChange: true };
    }
    // No head system message (run without an agent) — keep the update rather than drop it.
    return { messages: [...messages, { role: "system", content: result.update }], contextEpochActive: true, didChange: true };
  }
  if (result.type === "replaced" && step > 0) {
    // Replaced: refresh the head system message content in place.
    const idx = headSystemIndex(messages);
    const updated = [...messages];
    if (idx >= 0) {
      const head = updated[idx]!;
      updated[idx] = { ...head, content: result.systemContext.baseline };
    } else {
      updated.unshift({ role: "system", content: result.systemContext.baseline });
    }
    return { messages: updated, contextEpochActive: true, didChange: true };
  }
  return { messages, contextEpochActive: true, didChange: false };
}

// ---------------------------------------------------------------------------
// Compaction
// ---------------------------------------------------------------------------

interface CompactionResult {
  messages: ChatMessage[];
  didCompact: boolean;
}

async function maybeCompact(
  messages: ChatMessage[],
  runModel: { countTokens?: (content: string) => number; contextLimit?: number },
  deps: RunLoopDeps,
  signal: AbortSignal,
  sessionId: string | undefined,
  emitEvent?: (type: string, data: Record<string, unknown>) => Promise<void>,
): Promise<CompactionResult> {
  if (!deps.compactor) return { messages, didCompact: false };

  let shouldCompact = true;
  if (runModel.countTokens) {
    const estimatedInput = messages.reduce((sum, m) => sum + runModel.countTokens!(getTextContent(m.content)), 0);
    const contextWindow = runModel.contextLimit ?? deps.maxTokens * 4;
    const ratio = deps.compactionThreshold ?? 0.75;
    const threshold = Math.floor(contextWindow * ratio);
    shouldCompact = estimatedInput > threshold;
  }

  if (!shouldCompact) return { messages, didCompact: false };

  const compacted = await deps.compactor.compact(messages, signal);
  if (compacted.summary.compressedMessageCount < compacted.summary.originalMessageCount) {
    await emitEvent?.("context.compressed", {
      originalCount: compacted.summary.originalMessageCount,
      compressedCount: compacted.summary.compressedMessageCount,
    });
    await deps.pluginManager?.fireHook("onContextCompressed", {
      originalCount: compacted.summary.originalMessageCount,
      compressedCount: compacted.summary.compressedMessageCount,
    });

    // RV-15 durable compaction: persist the summary as a durable marker so that
    // a restart / resume rebuilds the compacted context instead of the raw
    // transcript. Best-effort — a store failure must NOT roll back the run or
    // the compaction (the in-memory compacted context still applies).
    if (sessionId) {
      const summaryText = compacted.summary.summary
        ? `${COMPACTION_SUMMARY_PREFIX}${compacted.summary.summary}`
        : `${COMPACTION_SUMMARY_PREFIX}Compressed ${compacted.summary.originalMessageCount} → ${compacted.summary.compressedMessageCount} messages`;
      try {
        await deps.addSessionMessage(sessionId, "system", summaryText);
      } catch (err) {
        if (typeof console !== "undefined") {
          console.warn("[run-loop] Failed to persist compaction summary:", err instanceof Error ? err.message : String(err));
        }
      }
    }

    return { messages: [...compacted.messages], didCompact: true };
  }

  return { messages, didCompact: false };
}

async function compactOnOverflow(
  messages: ChatMessage[],
  compactor: ConversationCompactor,
  step: number,
  signal: AbortSignal,
  sessionId: string | undefined,
  addSessionMessage: (sid: string | undefined, role: string, content: string, extra?: Record<string, unknown>) => Promise<void>,
): Promise<ChatMessage[]> {
  if (step <= 0) throw new Error("Cannot compact on step 0 — context overflow should not occur on first step");
  const compacted = await compactor.compact(messages, signal);
  // RV-15: overflow compaction is also durable — persist a summary marker so a
  // restart rebuilds the compacted context. Best-effort, never rolls back.
  if (compacted.summary.compressedMessageCount < compacted.summary.originalMessageCount && sessionId) {
    const summaryText = compacted.summary.summary
      ? `${COMPACTION_SUMMARY_PREFIX}${compacted.summary.summary}`
      : `${COMPACTION_SUMMARY_PREFIX}Compressed ${compacted.summary.originalMessageCount} → ${compacted.summary.compressedMessageCount} messages`;
    try {
      await addSessionMessage(sessionId, "system", summaryText);
    } catch (err) {
      if (typeof console !== "undefined") {
        console.warn("[run-loop] Failed to persist overflow compaction summary:", err instanceof Error ? err.message : String(err));
      }
    }
  }
  return [...compacted.messages];
}

function isContextOverflowError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    (lower.includes("context") || lower.includes("maximum") || lower.includes("too long") || lower.includes("too large")) &&
    (lower.includes("token") || lower.includes("length"))
  );
}

// ---------------------------------------------------------------------------
// Step processing
// ---------------------------------------------------------------------------

interface StepInput {
  messages: ChatMessage[];
  step: number;
  runId: RunId;
  ctx: RequestContext;
  runAbort: AbortController;
  sessionId?: string;
  runModel: ModelProvider;
  runSessionState?: SessionRuntimeState;
  totalInputTokens: number;
  totalOutputTokens: number;
  finalOutput: string;
  disableTools?: boolean;
}

interface StepOutput {
  messages: ChatMessage[];
  step: number;
  runId: RunId;
  totalInputTokens: number;
  totalOutputTokens: number;
  finalOutput: string;
  completed: boolean;
  toolCallCount: number;
  lastStepToolOutcomes: readonly ToolCallOutcome[];
  /** If set, the step itself failed (e.g. step timeout) without failing the run. */
  stepFailed?: { reason: string; error?: string };
}

async function processStep(deps: RunLoopDeps, input: StepInput): Promise<StepOutput> {
  const { runId, ctx, runAbort, sessionId, runModel, runSessionState } = input;
  const stepTimeoutController = new AbortController();
  const stepTimer = setTimeout(() => stepTimeoutController.abort(), deps.stepTimeout);
  const onRunAbort = () => { clearTimeout(stepTimer); stepTimeoutController.abort(); };
  runAbort.signal.addEventListener("abort", onRunAbort, { once: true });

  try {
    if (runAbort.signal.aborted) {
      // RV-7: an abort landing between the loop guard and the step start must
      // not silently report `succeeded` — surface it so the run-loop catch can
      // converge on the single `cancelled` terminal outcome.
      throw new DOMException("Run cancelled", "AbortError");
    }

    if (!deps.permissionGate.checkMaxTokens(input.totalInputTokens, input.totalOutputTokens, deps.currentAgent)) {
      throw new KernelError("max_tokens_exceeded", `Agent max tokens exceeded (${input.totalInputTokens + input.totalOutputTokens})`);
    }

    let messages = input.messages;

    if (deps.thinkingBudget > 0) {
      await deps.modelCaller.doThinkingStep(messages, input.step, runId, ctx, stepTimeoutController.signal);
    }

    let response: ModelResponse;
    try {
      response = await deps.circuitBreaker.call(() =>
        deps.modelCaller.callModelStream(
          messages, input.step, runId, ctx, stepTimeoutController.signal,
          deps.currentAgent?.permissions?.maxTokens,
          input.disableTools,
        ), stepTimeoutController.signal);
    } catch (err: unknown) {
      if (stepTimeoutController.signal.aborted && !runAbort.signal.aborted) {
        // Step-level timeout: the step fails but the run continues to the next step.
        return {
          messages,
          step: input.step,
          runId,
          totalInputTokens: input.totalInputTokens,
          totalOutputTokens: input.totalOutputTokens,
          finalOutput: input.finalOutput,
          completed: false,
          toolCallCount: 0,
          lastStepToolOutcomes: [],
          stepFailed: { reason: "timeout", error: `Model call timed out after ${deps.stepTimeout}ms` },
        };
      }
      const circuitErr = err as { constructor?: typeof CircuitBreakerOpenError };
      if (circuitErr?.constructor?.name === "CircuitBreakerOpenError") {
        throw new KernelError("model_unavailable", (err as Error).message, err as Error);
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      if (isContextOverflowError(errMsg) && deps.compactor && input.step > 0) {
        const compactor = deps.compactor;
        messages = await compactOnOverflow(messages, compactor, input.step, stepTimeoutController.signal, sessionId, deps.addSessionMessage);
        runSessionState?.resetMessages(messages);
        response = await deps.circuitBreaker.call(() =>
          deps.modelCaller.callModelStream(
            messages, input.step, runId, ctx, stepTimeoutController.signal,
            deps.currentAgent?.permissions?.maxTokens,
          ),
          stepTimeoutController.signal,
        );
      } else {
        throw err;
      }
    }

    // RV-42: single authoritative token accounting — prefer the provider's usage
    // (now surfaced on ModelResponse), fall back to local countTokens.
    const usageIn = response.usage?.promptTokens;
    const usageOut = response.usage?.completionTokens;
    if (usageIn !== undefined && usageIn > 0) {
      input.totalInputTokens += usageIn;
    } else if (runModel.countTokens) {
      input.totalInputTokens += messages.reduce((sum, m) => sum + runModel.countTokens!(getTextContent(m.content)), 0);
    }
    if (usageOut !== undefined && usageOut > 0) {
      input.totalOutputTokens += usageOut;
    } else if (runModel.countTokens) {
      input.totalOutputTokens += runModel.countTokens(response.content);
    }

    const toolCalls = response.toolCalls ?? [];

    messages.push({
      role: "assistant",
      content: response.content,
      ...(toolCalls.length > 0 ? {
        toolCalls: toolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          args: tc.args as Record<string, unknown>,
        })),
      } : {}),
    });

    const asstTokens = { input: input.totalInputTokens, output: input.totalOutputTokens };
    const asstModel = runModel.model;
    const msgCost = deps.modelCaller.calculateCost(asstTokens.input, asstTokens.output, runModel);
    await deps.addSessionMessage(sessionId, "assistant", response.content, {
      tokens: asstTokens,
      ...(asstModel ? { model: asstModel } : {}),
      ...(msgCost !== undefined ? { cost: msgCost } : {}),
    });

    if (toolCalls.length === 0) {
      return {
        messages,
        step: input.step,
        runId,
        totalInputTokens: input.totalInputTokens,
        totalOutputTokens: input.totalOutputTokens,
        finalOutput: response.content,
        completed: true,
        toolCallCount: 0,
        lastStepToolOutcomes: [],
      };
    }

    const { toolCallCount, selfCorrectTokens, toolResults } = await deps.stepExecutor.executeToolCalls(
      toolCalls.map((tc) => ({ toolId: tc.id, toolName: tc.name, args: tc.args })),
      messages, input.step, runId, ctx, stepTimeoutController, sessionId, runModel,
    );

    if (stepTimeoutController.signal.aborted && !runAbort.signal.aborted) {
      // Step timed out during tool execution — surface an error for any tool call
      // that never got a response so the conversation stays coherent for the model.
      for (const tc of toolCalls) {
        if (!messages.some((m) => m.role === "tool" && m.toolCallId === tc.id)) {
          messages.push({ role: "tool", toolCallId: tc.id, content: `Error: Step timed out after ${deps.stepTimeout}ms` });
        }
      }
      return {
        messages,
        step: input.step,
        runId,
        totalInputTokens: input.totalInputTokens,
        totalOutputTokens: input.totalOutputTokens,
        finalOutput: input.finalOutput,
        completed: false,
        toolCallCount,
        lastStepToolOutcomes: toolResults,
        stepFailed: { reason: "timeout", error: `Tool execution timed out after ${deps.stepTimeout}ms` },
      };
    }

    // Accumulate self-correction tokens into run totals
    input.totalInputTokens += selfCorrectTokens.input;
    input.totalOutputTokens += selfCorrectTokens.output;

    if (runSessionState) {
      runSessionState.step = input.step + 1;
      runSessionState.toolCallCount += toolCallCount;
    }

    // Snapshot run state — awaited so a write failure is observed before the
    // step is reported complete, preventing silent state loss (RV-33).
    try {
      await deps.store.saveSnapshot(runId, {
        step: input.step + 1,
        model: runModel.model,
        totalInputTokens: input.totalInputTokens,
        totalOutputTokens: input.totalOutputTokens,
        finalOutput: input.finalOutput,
        sessionId,
      });
    } catch (err) {
      if (typeof console !== "undefined") {
        console.warn("[run-loop] Failed to save snapshot:", err instanceof Error ? err.message : String(err));
      }
    }

    return {
      messages,
      step: input.step,
      runId,
      totalInputTokens: input.totalInputTokens,
      totalOutputTokens: input.totalOutputTokens,
      finalOutput: input.finalOutput,
      completed: false,
      toolCallCount,
      lastStepToolOutcomes: toolResults,
    };
  } finally {
    clearTimeout(stepTimer);
    runAbort.signal.removeEventListener("abort", onRunAbort);
  }
}

// ---------------------------------------------------------------------------
// Run loop
// ---------------------------------------------------------------------------

export async function runLoop(
  deps: RunLoopDeps,
  input: RunLoopInput,
): Promise<RunLoopResult> {
  const { prompt, runId, ctx, runAbort, sessionId, userContentParts, runModel, runSessionState, addSessionMessage, emitEvent, setState, emitCompleted, emitFail } = input;

  const startTime = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let messages: ChatMessage[] = [];
  let step = 0;
  let finalOutput = "";
  let contextEpochActive = false;
  // Real system head (identity + agent systemPrompt) sent as a proper `system`
  // message at the head of the conversation instead of being flattened into the
  // user turn (RV-40).
  const systemHead: ChatMessage[] = input.systemPrompt
    ? [{ role: "system", content: input.systemPrompt }]
    : [];

  // Single max-steps authority: resolve the run's step budget from every
  // applicable source (config default, termination policy, agent permission)
  // once, then enforce it in exactly one place — the loop bound below.
  const runMaxSteps = Math.min(
    deps.termination?.maxSteps ?? Number.POSITIVE_INFINITY,
    deps.currentAgent?.permissions?.maxSteps ?? Number.POSITIVE_INFINITY,
    deps.maxSteps,
  );

  const emitEvt = (type: string, data: Record<string, unknown>) =>
    emitEvent({
      id: crypto.randomUUID(), runId, type,
      occurredAt: new Date().toISOString(), traceId: ctx.traceId,
      data,
    });

  const saveFinalSnapshot = async (status: string) => {
    try {
      await deps.store.saveSnapshot(runId, {
        step: step + 1,
        model: runModel.model,
        totalInputTokens,
        totalOutputTokens,
        finalOutput,
        sessionId,
        status,
      });
    } catch (err) {
      if (typeof console !== "undefined") {
        console.warn("[run-loop] Failed to save final snapshot:", err instanceof Error ? err.message : String(err));
      }
    }
  };

  // RV-7: exactly ONE terminal cancelled outcome regardless of abort timing.
  // Every cancellation path funnels through this single block (loop guard,
  // step-start abort, in-flight AbortError, and terminal-emission guards), so a
  // run cancelled at any moment reports `cancelled` exactly once — never a
  // silent `succeeded` or a confusing `failed`.
  const cancelRun = async (steps: number): Promise<RunLoopResult> => {
    await emitFail(runId, ctx, "Run cancelled", steps, sessionId, totalInputTokens, totalOutputTokens, Date.now() - startTime, true);
    await deps.saga.rollbackAll();
    setState(runId, "cancelled");
    if (runSessionState) runSessionState.isRunning = false;
    await saveFinalSnapshot("cancelled");
    return { totalSteps: steps, status: "cancelled" };
  };

  try {
    setState(runId, "running");

    // Re-queue any persisted-but-un-promoted inputs before the first step drains (RV-21).
    if (deps.beforeRun) {
      await deps.beforeRun(runId);
    }

    const startedModel = runModel.model;
    const startedAgentName = deps.currentAgent?.profile.name;
    const startedAgentId = deps.currentAgent?.id;

    // Skip run.started event when resuming from durable storage
    if (!input.resume) {
      // Audit + session record keep the full effective prompt (system head +
      // user prompt); the messages sent to the model split them into a real
      // `system` head + `user` turn (RV-40).
      const effectivePrompt = [input.systemPrompt, prompt].filter(Boolean).join("\n\n");
      await emitEvt("run.started", {
        prompt: effectivePrompt,
        ...(startedModel ? { model: startedModel } : {}),
        ...(startedAgentName ? { agentName: startedAgentName } : {}),
        ...(startedAgentId ? { agentId: startedAgentId } : {}),
      });

      await deps.pluginManager?.fireHook("onRunStarted", { runId, prompt });

      const currentModel = runModel.model;
      await addSessionMessage(sessionId, "user", effectivePrompt,
        { ...(currentModel ? { model: currentModel } : {}) },
      );

      messages = [
        ...systemHead,
        userContentParts?.length
          ? { role: "user" as const, content: userContentParts as unknown as readonly ContentPart[] }
          : { role: "user" as const, content: prompt },
      ];
    }

    // On resume, rebuild from persisted history (never double-append it) and keep
    // the current steering prompt as the latest user turn. On a continuation run
    // the conversation history must come BEFORE the fresh prompt so the
    // transcript stays chronologically ordered (the prompt was seeded above).
    if (input.resume) {
      if (runSessionState && runSessionState.messages.length > 0) {
        messages = [...runSessionState.messages];
      }
      if (prompt) messages.push({ role: "user", content: prompt });
      // Persisted history predates the RV-40 system head — re-inject it so a
      // resumed run still sends a real `system` message to the model.
      if (systemHead.length > 0 && !messages.some((m) => m.role === "system")) {
        messages = [...systemHead, ...messages];
      }
    } else if (runSessionState && runSessionState.messages.length > 0) {
      messages = [
        ...systemHead,
        ...runSessionState.messages,
        userContentParts?.length
          ? { role: "user" as const, content: userContentParts as unknown as readonly ContentPart[] }
          : { role: "user" as const, content: prompt },
      ];
    }

    // Continue from the restored step counter so max-steps accounting and any
    // step-relative logic stay continuous across a resume.
    const startedStep = runSessionState?.step ?? 0;

    for (step = startedStep; step < runMaxSteps; step++) {
      if (runAbort.signal.aborted) {
        return cancelRun(step);
      }

      const drainedInputs = deps.stateMachine.drainInputs(runId);
      for (const text of drainedInputs) {
        messages.push({ role: "user", content: text });
      }
      if (drainedInputs.length > 0 && deps.onInputsDrained) {
        await deps.onInputsDrained(runId, drainedInputs);
      }

      if (deps.systemContext) {
        if (!contextEpochActive) {
          const result = await initializeSystemContext(deps.systemContext, messages);
          messages = result.messages;
          contextEpochActive = result.contextEpochActive;
        } else {
          const result = await reconcileSystemContext(deps.systemContext, messages, step);
          messages = result.messages;
          contextEpochActive = result.contextEpochActive;
        }
      }

      await emitEvt("step.started", { step });
      await deps.pluginManager?.fireHook("onStepStarted", { step });

      const compactResult = await maybeCompact(
        messages,
        {
          ...(runModel.countTokens ? { countTokens: runModel.countTokens } : {}),
          ...(runModel.contextLimit !== undefined ? { contextLimit: runModel.contextLimit } : {}),
        },
        deps, runAbort.signal, sessionId,
        (type, data) => emitEvt(type, data),
      );
      if (compactResult.didCompact) {
        messages = compactResult.messages;
        runSessionState?.resetMessages(compactResult.messages);
        if (deps.systemContext) {
          contextEpochActive = false;
        }
      }

      if (step >= runMaxSteps - 1) {
        messages.push({
          role: "system",
          content: `[You have reached the maximum number of steps (${runMaxSteps}). This is your final opportunity to respond. Do NOT call any tools. Provide a comprehensive summary and any final output.]`,
        });
      }

      const onLastStep = step >= runMaxSteps - 1;
      const stepResult = await processStep(deps, {
        messages, step, runId, ctx, runAbort,
        ...(sessionId !== undefined ? { sessionId } : {}),
        runModel,
        ...(runSessionState !== undefined ? { runSessionState } : {}),
        totalInputTokens, totalOutputTokens, finalOutput,
        ...(onLastStep ? { disableTools: true } : {}),
      });

      messages = stepResult.messages;
      totalInputTokens = stepResult.totalInputTokens;
      totalOutputTokens = stepResult.totalOutputTokens;
      finalOutput = stepResult.finalOutput;

      if (stepResult.stepFailed) {
        await emitEvt("step.failed", { step, reason: stepResult.stepFailed.reason, ...(stepResult.stepFailed.error ? { error: stepResult.stepFailed.error } : {}) });
        await deps.pluginManager?.fireHook("onStepFailed", { step, reason: stepResult.stepFailed.reason, ...(stepResult.stepFailed.error ? { error: stepResult.stepFailed.error } : {}) });
      } else {
        await emitEvt("step.completed", { step, toolCallCount: stepResult.toolCallCount });
        await deps.pluginManager?.fireHook("onStepCompleted", { step, toolCallCount: stepResult.toolCallCount });
      }

      if (stepResult.completed) {
        finalOutput = stepResult.finalOutput;
        break;
      }

      // ── Termination policy (Phase 4): token budget cut + stop conditions ──
      const termination = deps.termination;
      if (termination) {
        const budget = termination.budgetTokens;
        if (budget) {
          const total = totalInputTokens + totalOutputTokens;
          const over =
            (budget.input !== undefined && totalInputTokens > budget.input) ||
            (budget.output !== undefined && totalOutputTokens > budget.output) ||
            (budget.total !== undefined && total > budget.total);
          if (over) {
            if (runAbort.signal.aborted) return cancelRun(step + 1);
            const reason = `Token budget exceeded (${total} tokens)`;
            await emitFail(runId, ctx, reason, step, sessionId, totalInputTokens, totalOutputTokens);
            await deps.saga.rollbackAll();
            setState(runId, "failed");
            return { totalSteps: step + 1, status: "failed" };
          }
        }

        const stopCtx: StepVerificationContext = {
          runId, step,
          finalOutput,
          totalInputTokens, totalOutputTokens,
          lastStepToolOutcomes: stepResult.lastStepToolOutcomes,
        };

        let stopReason: StopCondition["kind"] | "stop-hook" | undefined;
        if (!termination.stopConditions && !termination.stopHooks) {
          // nothing to evaluate
        } else {
          const declarative = evaluateStopConditions(
            (termination.stopConditions ?? []).filter((c) => c.kind === "tool-output" || c.kind === "state"),
            stopCtx,
          );
          if (declarative) {
            stopReason = declarative.kind;
          } else {
            for (const cond of termination.stopConditions ?? []) {
              if (cond.kind !== "llm-judge") continue;
              const judgeModel = deps.judgeModel ?? deps.modelCaller.getActiveModel(runId);
              const res = await judgeModel.generate(
                { messages: buildJudgeMessages(cond, stopCtx, termination.evaluatorAgent) as ChatMessage[], tools: [], maxTokens: 500 },
                runAbort.signal,
              );
              if (parseJudgeVerdict(res.content).met) {
                stopReason = "llm-judge";
                break;
              }
            }
            if (!stopReason) {
              for (const hook of termination.stopHooks ?? []) {
                if ((await hook.onStepEnded(stopCtx)) === "stop") {
                  stopReason = "stop-hook";
                  break;
                }
              }
            }
          }
        }

        if (stopReason) {
          if (runAbort.signal.aborted) return cancelRun(step + 1);
          await emitCompleted({
            id: crypto.randomUUID(), runId, type: "run.completed",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: {
              status: "succeeded", output: finalOutput, totalSteps: step + 1,
              durationMs: Date.now() - startTime,
              stopCondition: stopReason,
              ...(totalInputTokens > 0 ? { inputTokens: totalInputTokens } : {}),
              ...(totalOutputTokens > 0 ? { outputTokens: totalOutputTokens } : {}),
            },
          }, sessionId, runId, totalInputTokens, totalOutputTokens, "succeeded");
          await deps.pluginManager?.fireHook("onRunCompleted", { status: "succeeded", output: finalOutput, stopCondition: stopReason });
          setState(runId, "completed");
          if (runSessionState) {
            runSessionState.resetMessages(messages);
            runSessionState.step = step + 1;
            runSessionState.isRunning = false;
          }
          await saveFinalSnapshot("succeeded");
          return { totalSteps: step + 1, status: "succeeded" };
        }
      }
    }

    const durationMs = Date.now() - startTime;
    if (step >= runMaxSteps) {
      if (runAbort.signal.aborted) return cancelRun(step + 1);
      if (finalOutput) {
        await emitCompleted({
          id: crypto.randomUUID(), runId, type: "run.completed",
          occurredAt: new Date().toISOString(), traceId: ctx.traceId,
          data: {
            status: "succeeded", output: finalOutput, totalSteps: step + 1,
            durationMs,
            ...(totalInputTokens > 0 ? { inputTokens: totalInputTokens } : {}),
            ...(totalOutputTokens > 0 ? { outputTokens: totalOutputTokens } : {}),
          },
        }, sessionId, runId, totalInputTokens, totalOutputTokens, "succeeded");
        await deps.pluginManager?.fireHook("onRunCompleted", { status: "succeeded", output: finalOutput });
        if (deps.sessionStore && deps.sessionTitleGenerator && sessionId) {
          const session = await deps.sessionStore.getSession(sessionId).catch(() => null);
          if (session && (!session.title || session.title === "New Session")) {
            const title = await deps.sessionTitleGenerator(prompt).catch(() => "");
            if (title) {
              await deps.sessionStore.updateSession(sessionId, { title }).catch((err) => {
                if (typeof console !== "undefined") {
                  console.warn("[run-loop] Failed to update session title:", err instanceof Error ? err.message : String(err));
                }
              });
            }
          }
        }
        setState(runId, "completed");
        await saveFinalSnapshot("succeeded");
        return { totalSteps: step + 1, status: "succeeded" };
      }
      if (runAbort.signal.aborted) return cancelRun(step + 1);
      await emitFail(runId, ctx, `Exceeded max steps (${runMaxSteps})`, step, sessionId, totalInputTokens, totalOutputTokens, durationMs);
      await deps.saga.rollbackAll();
      setState(runId, "failed");
      return { totalSteps: step, status: "failed" };
    } else {
      if (runAbort.signal.aborted) return cancelRun(step + 1);
      await emitCompleted({
        id: crypto.randomUUID(), runId, type: "run.completed",
        occurredAt: new Date().toISOString(), traceId: ctx.traceId,
        data: {
          status: "succeeded", output: finalOutput, totalSteps: step + 1,
          durationMs,
          ...(totalInputTokens > 0 ? { inputTokens: totalInputTokens } : {}),
          ...(totalOutputTokens > 0 ? { outputTokens: totalOutputTokens } : {}),
        },
      }, sessionId, runId, totalInputTokens, totalOutputTokens, "succeeded");

      await deps.pluginManager?.fireHook("onRunCompleted", { status: "succeeded", output: finalOutput });

      if (deps.sessionStore && deps.sessionTitleGenerator && sessionId) {
        const session = await deps.sessionStore.getSession(sessionId).catch(() => null);
        if (session && (!session.title || session.title === "New Session")) {
          const title = await deps.sessionTitleGenerator(prompt).catch(() => "");
          if (title) {
            await deps.sessionStore.updateSession(sessionId, { title }).catch((err) => {
              if (typeof console !== "undefined") {
                console.warn("[run-loop] Failed to update session title:", err instanceof Error ? err.message : String(err));
              }
            });
          }
        }
      }
    }

    setState(runId, "completed");

    if (runSessionState) {
      runSessionState.resetMessages(messages);
      runSessionState.step = step + 1;
      runSessionState.isRunning = false;
    }

    await saveFinalSnapshot("succeeded");
    return { totalSteps: step + 1, status: "succeeded" };
  } catch (err: unknown) {
    // A cancellation that surfaced as an abort (e.g. the model call rejecting
    // with AbortError, or the step-start guard) must converge on the single
    // `cancelled` terminal outcome — never a confusing `failed`.
    if (runAbort.signal.aborted) {
      return cancelRun(step + 1);
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    const failDurationMs = Date.now() - startTime;
    // emitFail already emits run.completed(failed); roll back the per-run saga explicitly.
    await deps.saga.rollbackAll();
    await emitFail(runId, ctx, errorMsg, step, sessionId, totalInputTokens, totalOutputTokens, failDurationMs);
    setState(runId, "failed");
    if (runSessionState) runSessionState.isRunning = false;
    return { totalSteps: step + 1, status: "failed" };
  } finally {
    deps.saga.clear();
    deps.stateMachine.cleanupRun(runId, sessionId);
  }
}
