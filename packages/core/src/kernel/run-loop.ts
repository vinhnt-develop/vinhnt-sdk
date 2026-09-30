import type { RequestContext, RunId, AgentConfig, ContentPart } from "@vinhnt-sdk/schema";
import { getTextContent, COMPACTION_SUMMARY_PREFIX } from "@vinhnt-sdk/schema";
import type { ChatMessage, MessageContentPart, ModelProvider, ModelResponse } from "../model.js";
import type { ContextRegistry } from "../system-context/types.js";
import type { ConversationCompactor } from "@vinhnt-sdk/session";
import type { RunEventStore, SessionStore } from "@vinhnt-sdk/session";
import type { PluginManager } from "../plugin.js";
import type { SessionRuntimeState } from "@vinhnt-sdk/session";
import { KernelError } from "@vinhnt-sdk/step-executor";
import { DEFAULT_CONTEXT_WINDOW, type ModelCaller } from "@vinhnt-sdk/llm";
import type { PermissionGate } from "@vinhnt-sdk/step-executor";
import type { StepExecutor } from "@vinhnt-sdk/step-executor";
import type { ToolSaga } from "@vinhnt-sdk/tools";
import type { CircuitBreaker, CircuitBreakerOpenError } from "@vinhnt-sdk/step-executor";
import type { RunStateMachine } from "@vinhnt-sdk/step-executor";
import { evaluateStopConditions, buildJudgeMessages, parseJudgeVerdict } from "@vinhnt-sdk/step-executor";
import type { StopCondition, StepVerificationContext, TerminationPolicy, ToolCallOutcome } from "@vinhnt-sdk/step-executor";
import type { Guardrail, GuardrailResult } from "@vinhnt-sdk/guardrails";
import { runGuardrails } from "@vinhnt-sdk/guardrails";
import type { RecentCall } from "@vinhnt-sdk/guard";
import type { z } from "zod";
import type { ResponseFormat } from "@vinhnt-sdk/schema";
import { zodSchemaToNestedJsonSchema } from "@vinhnt-sdk/tools";

/**
 * Convert a Zod schema to ResponseFormat for structured output.
 * Uses the existing zodSchemaToNestedJsonSchema utility from @vinhnt-sdk/tools.
 */
function zodToResponseFormat(schema: z.ZodTypeAny, name: string): ResponseFormat {
  const jsonSchema = zodSchemaToNestedJsonSchema(schema);
  if (jsonSchema) {
    return {
      type: "json_schema",
      jsonSchema: { name, schema: jsonSchema, strict: true },
    };
  }
  // Fallback: basic json_object format
  return { type: "json_object" };
}

/**
 * Validate structured output against a Zod schema.
 * Returns parsed output or throws on validation failure.
 */
function validateStructuredOutput(schema: z.ZodTypeAny, output: string): unknown {
  const parsed = JSON.parse(output);
  return schema.parse(parsed);
}

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
  /** Input guardrails — run before model calls. */
  readonly inputGuardrails?: readonly Guardrail[];
  /** Output guardrails — run after model responses. */
  readonly outputGuardrails?: readonly Guardrail[];
  /** Structured output type — 'text' or Zod schema. */
  readonly outputType?: 'text' | z.ZodTypeAny;
  /** Per-run workspace root override. Tools operate within this directory. */
  readonly workspaceRoot?: string;
  /** Optional judge model for `llm-judge` stop conditions (defaults to the active run model). */
  readonly judgeModel?: ModelProvider;
  /** Fallback model ids to try when the primary model fails (P1-2 failover). */
  readonly failoverModels?: readonly string[];
  /** Model registry used to resolve failover model ids. */
  readonly modelRegistry?: import("../model.js").ModelRegistry;
  /** Unified context budget (P1-1). */
  readonly contextBudget?: import("../context/context-budget.js").ContextBudget;
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
  /**
   * Optional callback invoked before each step. Allows dynamic model/tool selection.
   *
   * Inspired by Vercel AI SDK's `prepareStep` pattern.
   *
   * @example
   * ```typescript
   * prepareStep: async ({ step, model, messages }) => {
   *   // Use a cheaper model for early steps
   *   if (step < 3) return { model: fastModel };
   *   return {}; // use defaults
   * }
   * ```
   */
  prepareStep?: (params: {
    step: number;
    model: ModelProvider;
    messages: readonly ChatMessage[];
  }) => Promise<{ model?: ModelProvider } | void>;
}

export type RunLoopStatus = "succeeded" | "failed" | "cancelled";

export interface RunLoopResult {
  readonly totalSteps: number;
  readonly status: RunLoopStatus;
  readonly totalInputTokens?: number;
  readonly totalOutputTokens?: number;
  readonly durationMs?: number;
  /** Validated structured output (when outputType is Zod schema). */
  readonly structuredOutput?: unknown;
  /** If set, a handoff was detected — kernel should transfer control. */
  readonly handoff?: {
    readonly targetAgentId: string;
    readonly reason: string;
    readonly summary?: string | undefined;
    readonly context?: Record<string, unknown> | undefined;
  };
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
    // Count text AND tool-call args — a write_file arg carries the whole file
    // body, so ignoring it (old behavior) under-estimates badly and the window
    // overflows before compaction ever triggers.
    const estimatedInput = messages.reduce((sum, m) => {
      let s = runModel.countTokens!(getTextContent(m.content));
      if (m.toolCalls && m.toolCalls.length > 0) s += runModel.countTokens!(JSON.stringify(m.toolCalls));
      return sum + s;
    }, 0);
    // E5a: context window ≠ 4×max output — fall back to DEFAULT_CONTEXT_WINDOW.
    const contextWindow = runModel.contextLimit ?? DEFAULT_CONTEXT_WINDOW;
    const ratio = deps.compactionThreshold ?? 0.75;
    const threshold = Math.floor(contextWindow * ratio);
    shouldCompact = estimatedInput > threshold;
  } else {
    // No tokenizer: approximate at 4 chars/token (text + tool-call args)
    // instead of the old "no countTokens → always compact" behavior.
    let chars = 0;
    for (const m of messages) {
      chars += getTextContent(m.content).length;
      if (m.toolCalls && m.toolCalls.length > 0) chars += JSON.stringify(m.toolCalls).length;
    }
    // E5a: context window ≠ 4×max output — fall back to DEFAULT_CONTEXT_WINDOW.
    const contextWindow = runModel.contextLimit ?? DEFAULT_CONTEXT_WINDOW;
    const ratio = deps.compactionThreshold ?? 0.75;
    shouldCompact = Math.ceil(chars / 4) > Math.floor(contextWindow * ratio);
  }

  if (!shouldCompact) return { messages, didCompact: false };

  const compacted = await deps.compactor.compact(messages, signal);
  if (compacted.summary.compressedMessageCount < compacted.summary.originalMessageCount) {
    await emitEvent?.("context.compressed", {
      originalCount: compacted.summary.originalMessageCount,
      compressedCount: compacted.summary.compressedMessageCount,
      ...(compacted.summary.summary ? { summary: compacted.summary.summary } : {}),
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
  validatedOutput?: unknown;
  outputType?: 'text' | z.ZodTypeAny;
  workspaceRoot?: string;
  /** Bounded repair attempts when finish_reason=tool_calls but toolCalls empty. */
  toolCallRepairAttempts?: number;
  /** Bounded claim-vs-action repairs (prose "created file" with zero tool calls). */
  claimRepairAttempts?: number;
  /** Bounded retries when tool calls were suppressed by finish_reason safety. */
  suppressedRepairAttempts?: number;
  /** Force tool_choice=required on the next model call (set after claim repair). */
  forceToolChoice?: boolean;
  /** A file-mutating tool already succeeded earlier this run — claim-repair must not re-fire. */
  fileActionSucceeded?: boolean;
  /** Run-scoped doom-loop history seeded into step tool execution. */
  priorRecentCalls?: readonly RecentCall[];
  /** Emit a run event (wired from RunLoopInput.emitEvent — used by failover). */
  emitEvent?: (event: { id: string; runId: RunId; type: string; occurredAt: string; traceId: string; data: Record<string, unknown> }, persist?: boolean) => Promise<void>;
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
  /** If set, a handoff was detected — transfer control to target agent. */
  handoff?: {
    targetAgentId: string;
    reason: string;
    summary?: string | undefined;
    context?: Record<string, unknown> | undefined;
  };
  /** Validated structured output (when outputType is Zod schema). */
  structuredOutput?: unknown;
  outputType?: 'text' | z.ZodTypeAny;
  /** Propagated when a tool-call repair prompt was injected this step. */
  toolCallRepairAttempts?: number;
  /** Propagated when a claim-vs-action repair prompt was injected this step. */
  claimRepairAttempts?: number;
  /** Propagated when suppressed tool calls were retried this step. */
  suppressedRepairAttempts?: number;
  /** Set true when this step injected a claim repair so the next step forces tool_choice. */
  forceToolChoiceNext?: boolean;
  /** Run-scoped doom-loop history after this step (absent when no tools executed). */
  recentCalls?: RecentCall[];
}

/**
 * Strip Vietnamese diacritics (NFD + remove combining marks) and fold đ→d so
 * no-diacritics claims ("da tao file...") match the same patterns as NFC text.
 */
function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").normalize("NFC");
}

/** File-related verbs (VN), multiword forms first within each alternative. */
const VN_FILE_VERBS = String.raw`tạo(?:\s+mới)?|ghi|viết|sửa|cập nhật|xuất|hoàn\s+thành|lưu|thêm|chèn|thay\s+đổi|chỉnh\s+sửa`;
const VN_FILE_OBJECT = String.raw`(?:file|tập tin)`;
/**
 * Vietnamese claim patterns (E4):
 *  1) "đã [được] VERB … file"        — "Đã tạo xong file báo cáo.html"
 *  2) "file … đã [được] VERB"        — "File đã được ghi thành công"
 *  3) "[tôi|mình|…] [đã] VERB … file" — "Tôi tạo file index.html" (no "đã")
 * Gated on a file object nearby so general past-tense statements do not match;
 * first-person subjects are required when "đã" is absent to keep questions
 * ("Bạn có thể tạo file được không?") out.
 */
const VN_CLAIM_PATTERN =
  String.raw`(?:đã\s+(?:được\s+)?(?:${VN_FILE_VERBS})(?:\s+\S+){0,3}\s+${VN_FILE_OBJECT}` +
  String.raw`|${VN_FILE_OBJECT}(?:\s+\S+){0,6}?\s+đã\s+(?:được\s+)?(?:${VN_FILE_VERBS})` +
  String.raw`|(?:^|[\s,;:!?])\s*(?:tôi|mình|ta|tớ|tao|em)\s+(?:đã\s+)?(?:${VN_FILE_VERBS})(?:\s+\S+){0,3}\s+${VN_FILE_OBJECT})`;
const VN_CLAIM_RE = new RegExp(VN_CLAIM_PATTERN, "i");
const VN_CLAIM_ASCII_RE = new RegExp(stripDiacritics(VN_CLAIM_PATTERN), "i");
const EN_CLAIM_RE = /(?:created?|wrote|saved|generated|written)\s+(?:one\s+|a\s+|the\s+)?(?:new\s+)?file/i;

/**
 * File-mutating tools: once one of these succeeded earlier in the run, a later
 * prose claim about file work is (possibly) truthful — claim-repair would be a
 * false positive that forces a needless tool_choice=required turn (E4 live fix).
 */
const FILE_MUTATING_TOOLS = new Set(["write_file", "edit_file", "apply_patch"]);

/**
 * Detect "model claims it created/wrote a file but emitted zero tool calls"
 * with finish_reason=stop (or empty). Bounded repair instead of silently
 * completing with prose only (P0'-1).
 */
function detectMissedFileAction(content: string, finishReason: string | undefined): boolean {
  const fr = (finishReason ?? "").toLowerCase().replace(/_/g, "-");
  // Only consider "natural end" finishes — tool-calls path is handled separately.
  if (fr === "tool-calls" || fr === "tool_use" || fr === "tool-use") return false;
  const text = content ?? "";
  // Vietnamese + English claim patterns for file creation/write (E4: NFC-normalised,
  // matches with and without diacritics; "đã" optional when a first-person subject
  // is present; also handles file-first passive claims "File đã được ghi…").
  const norm = text.normalize("NFC").toLowerCase();
  const hasClaim =
    VN_CLAIM_RE.test(norm) ||
    VN_CLAIM_ASCII_RE.test(stripDiacritics(norm)) ||
    EN_CLAIM_RE.test(norm);
  // An explicit claim ("Đã tạo file X." = 25 chars) must repair even when
  // short — the length floor only guards the heuristic paths below.
  if (!hasClaim && text.length < 40) return false;
  // Large fenced code block strongly suggests the model meant to write a file.
  const fenced = (text.match(/```[\w-]*\n[\s\S]{80,}?```/g) ?? []).length > 0;
  // Or content looks like a file body (HTML/CSS/JSON/TS module markers) outside pure Q&A.
  const looksLikeFileBody = /<!DOCTYPE|<html|^\s*\{[\s\S]{60,}\}|^export\s+(?:const|function|default)/m.test(text);
  return hasClaim || (fenced && looksLikeFileBody) || (fenced && text.length > 400);
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

    // Run input guardrails before model call
    if (deps.inputGuardrails && deps.inputGuardrails.length > 0) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
      const inputContent = lastUserMsg?.content ?? "";
      const guardrailResult = await runGuardrails([...deps.inputGuardrails], {
        direction: "input",
        content: inputContent,
        metadata: { runId, step: input.step, agentId: deps.currentAgent?.id },
      });
      if (!guardrailResult.passed) {
        // Input guardrail denied — halt the run
        throw new KernelError("guardrail_denied", `Input guardrail denied: ${guardrailResult.reason ?? "unknown reason"}`);
      }
      // If guardrail modified content, update the message
      if (guardrailResult.modifiedContent !== undefined && lastUserMsg) {
        const modifiedText = typeof guardrailResult.modifiedContent === "string"
          ? guardrailResult.modifiedContent
          : JSON.stringify(guardrailResult.modifiedContent);
        messages = messages.map((m) =>
          m === lastUserMsg ? { ...m, content: modifiedText } : m,
        );
      }
    }

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
          input.forceToolChoice ? "required" : undefined,
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

      // P1-2: failover to secondary model on non-retryable / circuit-open failures.
      // Skip when user aborted — cancel must not resurrect a different model.
      // Context overflow goes to the compactor path below (not a failover candidate).
      const canFailover =
        !runAbort.signal.aborted &&
        !stepTimeoutController.signal.aborted &&
        (deps.failoverModels?.length ?? 0) > 0 &&
        deps.modelRegistry !== undefined &&
        !isContextOverflowError(err instanceof Error ? err.message : String(err));

      if (canFailover) {
        const fromModel = deps.modelCaller.getActiveModel(runId);
        const errMsg = err instanceof Error ? err.message : String(err);
        const circuitOpen = (err as { constructor?: { name?: string } })?.constructor?.name === "CircuitBreakerOpenError";
        const reason = circuitOpen ? "circuit_open" : errMsg.slice(0, 200);
        let failoverResponse: ModelResponse | undefined;

        for (const failoverId of deps.failoverModels!) {
          const alt = deps.modelRegistry!.get(failoverId);
          if (!alt) continue;
          if (alt.model === fromModel.model && alt.provider === fromModel.provider) continue;

          try {
            deps.modelCaller.setModelForRun(runId, alt);

            await input.emitEvent?.({
              id: `evt-failover-${runId}-${input.step}-${failoverId}`,
              runId,
              type: "llm.failover",
              occurredAt: new Date().toISOString(),
              traceId: ctx.traceId,
              data: {
                fromProvider: fromModel.provider,
                fromModel: fromModel.model,
                toProvider: alt.provider,
                toModel: alt.model,
                reason,
              },
            });

            failoverResponse = await deps.circuitBreaker.call(() =>
              deps.modelCaller.callModelStream(
                messages, input.step, runId, ctx, stepTimeoutController.signal,
                deps.currentAgent?.permissions?.maxTokens,
                input.disableTools,
                input.forceToolChoice ? "required" : undefined,
              ), stepTimeoutController.signal);
            break;
          } catch {
            if (stepTimeoutController.signal.aborted && !runAbort.signal.aborted) {
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
            // try next failover candidate
          }
        }

        if (failoverResponse) {
          response = failoverResponse;
        } else if (circuitOpen) {
          throw new KernelError("model_unavailable", errMsg, err as Error);
        } else {
          throw err;
        }
      } else {
        const circuitErr = err as { constructor?: typeof CircuitBreakerOpenError };
        if (circuitErr?.constructor?.name === "CircuitBreakerOpenError") {
          throw new KernelError("model_unavailable", (err as Error).message, err as Error);
        }

        // Context-overflow compaction path (original behavior).
        const errMsg = err instanceof Error ? err.message : String(err);
        if (isContextOverflowError(errMsg) && deps.compactor && input.step > 0) {
          const compactor = deps.compactor;
          messages = await compactOnOverflow(messages, compactor, input.step, stepTimeoutController.signal, sessionId, deps.addSessionMessage);
          runSessionState?.resetMessages(messages);
          response = await deps.circuitBreaker.call(() =>
            deps.modelCaller.callModelStream(
              messages, input.step, runId, ctx, stepTimeoutController.signal,
              deps.currentAgent?.permissions?.maxTokens,
              input.disableTools,
              input.forceToolChoice ? "required" : undefined,
            ),
            stepTimeoutController.signal,
          );
        } else {
          throw err;
        }
      }
    }

    // RV-42: single authoritative token accounting — prefer the provider's usage
    // (now surfaced on ModelResponse), fall back to local countTokens.
    const usageIn = response.usage?.promptTokens;
    const usageOut = response.usage?.completionTokens;
    if (usageIn !== undefined && usageIn > 0) {
      input.totalInputTokens += usageIn;
    } else if (runModel.countTokens) {
      input.totalInputTokens += messages.reduce((sum, m) => {
        let s = runModel.countTokens!(getTextContent(m.content));
        if (m.toolCalls && m.toolCalls.length > 0) s += runModel.countTokens!(JSON.stringify(m.toolCalls));
        return s;
      }, 0);
    }
    if (usageOut !== undefined && usageOut > 0) {
      input.totalOutputTokens += usageOut;
    } else if (runModel.countTokens) {
      input.totalOutputTokens += runModel.countTokens(response.content);
    }

    // Run output guardrails after model response
    let finalContent = response.content;
    if (deps.outputGuardrails && deps.outputGuardrails.length > 0) {
      const guardrailResult = await runGuardrails([...deps.outputGuardrails], {
        direction: "output",
        content: response.content,
        metadata: { runId, step: input.step, agentId: deps.currentAgent?.id, toolCalls: response.toolCalls?.map((tc) => tc.name) },
      });
      if (!guardrailResult.passed) {
        // Output guardrail denied — halt the run
        throw new KernelError("guardrail_denied", `Output guardrail denied: ${guardrailResult.reason ?? "unknown reason"}`);
      }
      // If guardrail modified content, use the modified version
      if (guardrailResult.modifiedContent !== undefined) {
        finalContent = typeof guardrailResult.modifiedContent === "string"
          ? guardrailResult.modifiedContent
          : JSON.stringify(guardrailResult.modifiedContent);
      }
    }

    // Validate structured output if outputType is Zod schema
    let validatedOutput: unknown = undefined;
    if (deps.outputType && deps.outputType !== 'text') {
      try {
        validatedOutput = validateStructuredOutput(deps.outputType, finalContent);
        // Use the validated (parsed) output as the final content
        finalContent = JSON.stringify(validatedOutput);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        throw new KernelError("validation_error", `Structured output validation failed: ${errMsg}`);
      }
    }

    const toolCalls = response.toolCalls ?? [];

    // P0'-7 Safety: suppress tool execution when finish_reason indicates
    // truncation/filter — half-written args must not run (DeerFlow pattern).
    const safetyFr = (response.finishReason ?? "").toLowerCase().replace(/_/g, "-");
    let suppressedToolCalls = false;
    let effectiveToolCalls = toolCalls;
    if (
      toolCalls.length > 0 &&
      (safetyFr === "content-filter" || safetyFr === "content_filter" ||
        safetyFr === "length" || safetyFr === "max-tokens" || safetyFr === "max_tokens")
    ) {
      effectiveToolCalls = [];
      suppressedToolCalls = true;
    }

    messages.push({
      role: "assistant",
      content: finalContent,
      ...(effectiveToolCalls.length > 0 ? {
        toolCalls: effectiveToolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          args: tc.args as Record<string, unknown>,
        })),
      } : {}),
    });

    const asstTokens = { input: input.totalInputTokens, output: input.totalOutputTokens };
    // After failover the active model may differ from the loop's runModel — re-read it.
    const activeAfter = deps.modelCaller.getActiveModel(runId);
    const asstModel = activeAfter.model ?? runModel.model;
    const msgCost = deps.modelCaller.calculateCost(asstTokens.input, asstTokens.output, activeAfter);
    // E1: never persist a text-less assistant row. Tool calls are not persisted
    // (only tool rows carry toolCallId), so an empty assistant row would render
    // as an empty bubble in UIs and reload as a useless orphan (messageToChatMessage
    // cannot restore toolCalls). In-memory history is unaffected — the live
    // messages.push above already kept this turn with its toolCalls.
    if (finalContent.trim().length > 0) {
      await deps.addSessionMessage(sessionId, "assistant", finalContent, {
        tokens: asstTokens,
        ...(asstModel ? { model: asstModel } : {}),
        ...(msgCost !== undefined ? { cost: msgCost } : {}),
      });
    }

    if (suppressedToolCalls) {
      // Surface to the model as a tool-result style note so it can retry cleanly.
      messages.push({
        role: "user",
        content: `[System] Tool calls were dropped because finish_reason=${response.finishReason} (response truncated or filtered). Partial text was kept. Call tools again with complete arguments if still needed.`,
      });
      const suppressedRepairs = input.suppressedRepairAttempts ?? 0;
      if (suppressedRepairs < 1) {
        return {
          messages,
          step: input.step,
          runId,
          totalInputTokens: input.totalInputTokens,
          totalOutputTokens: input.totalOutputTokens,
          finalOutput: finalContent,
          completed: false,
          toolCallCount: 0,
          lastStepToolOutcomes: [],
          suppressedRepairAttempts: suppressedRepairs + 1,
          ...(validatedOutput !== undefined ? { structuredOutput: validatedOutput } : {}),
        };
      }
      // Retry budget exhausted — fall through to the zero-tool-call handling
      // below (claim-repair / complete) instead of looping until maxSteps.
    }

    if (effectiveToolCalls.length === 0) {
      // Missed tool-call detection: model said finish_reason=tool_calls but
      // produced zero calls (malformed stream / dropped ids). Inject a repair
      // prompt (bounded) instead of falsely completing the run.
      const fr = (response.finishReason ?? "").toLowerCase().replace(/_/g, "-");
      const expectsTools = fr === "tool-calls" || fr === "tool_use" || fr === "tool-use";
      const repairs = input.toolCallRepairAttempts ?? 0;
      if (expectsTools && !input.disableTools && repairs < 2) {
        messages.push({
          role: "user",
          content: `[System] Your previous response had finish_reason=tool_calls but no tool calls were received (likely truncated or malformed). Emit complete tool calls now with valid JSON arguments, or reply with final text if no tools are needed.`,
        });
        return {
          messages,
          step: input.step,
          runId,
          totalInputTokens: input.totalInputTokens,
          totalOutputTokens: input.totalOutputTokens,
          finalOutput: response.content,
          completed: false,
          toolCallCount: 0,
          lastStepToolOutcomes: [],
          toolCallRepairAttempts: repairs + 1,
        };
      }
      if (expectsTools && !input.disableTools) {
        // Repair budget exhausted — fail hard rather than infinite-looping or
        // silently reporting success with no file written.
        throw new KernelError(
          "missed_tool_calls",
          `finish_reason=tool_calls but no tool calls after ${repairs} repair attempts`,
        );
      }

      // P0'-1 Claim-vs-action: finish_reason=stop but content claims file work
      // and no tools ran — force a repair turn with tool_choice=required.
      const claimRepairs = input.claimRepairAttempts ?? 0;
      if (
        !input.disableTools &&
        claimRepairs < 2 &&
        !input.fileActionSucceeded &&
        detectMissedFileAction(finalContent, response.finishReason)
      ) {
        messages.push({
          role: "user",
          content: `[System] You described creating or modifying a file in your last message, but you did not call write_file/edit_file/apply_patch — nothing was written to disk. Call the appropriate file tool NOW with the actual content. Do not repeat the file body only in chat.`,
        });
        return {
          messages,
          step: input.step,
          runId,
          totalInputTokens: input.totalInputTokens,
          totalOutputTokens: input.totalOutputTokens,
          finalOutput: response.content,
          completed: false,
          toolCallCount: 0,
          lastStepToolOutcomes: [],
          claimRepairAttempts: claimRepairs + 1,
          forceToolChoiceNext: true,
        };
      }

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
        ...(validatedOutput !== undefined ? { structuredOutput: validatedOutput } : {}),
      };
    }

    const { toolCallCount, selfCorrectTokens, toolResults, recentCalls, handoff } = await deps.stepExecutor.executeToolCalls(
      effectiveToolCalls.map((tc) => ({ toolId: tc.id, toolName: tc.name, args: tc.args })),
      messages, input.step, runId, ctx, stepTimeoutController, sessionId, runModel,
      input.priorRecentCalls,
    );

    // Handle handoff — transfer control to target agent
    if (handoff) {
      const currentAgentId = deps.currentAgent?.id ?? "unknown";
      // Note: handoff event is emitted in the main runLoop after processStep returns

      // Signal to kernel to swap active agent (kernel handles the swap)
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
        recentCalls,
        handoff: {
          targetAgentId: handoff.targetAgentId,
          reason: handoff.reason,
          summary: handoff.summary,
          context: handoff.context,
        },
      };
    }

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
        recentCalls,
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
      recentCalls,
      ...(validatedOutput !== undefined ? { structuredOutput: validatedOutput } : {}),
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
  let structuredOutput: unknown = undefined;
  let handoffResult: { targetAgentId: string; reason: string; summary?: string | undefined; context?: Record<string, unknown> | undefined } | undefined;
  let contextEpochActive = false;
  let toolCallRepairAttempts = 0;
  let claimRepairAttempts = 0;
  let suppressedRepairAttempts = 0;
  let forceToolChoiceNext = false;
  // E4 live fix: a successful file-mutating tool this run makes later prose
  // claims truthful — claim-repair must not force another tool turn.
  let fileActionSucceeded = false;
  // Run-scoped doom-loop history (per-step reset made doomLoopThreshold unreachable).
  let runRecentCalls: RecentCall[] = [];
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
    await emitEvt("turn.end", { turn: steps, reason: "aborted" });
    await emitFail(runId, ctx, "Run cancelled", steps, sessionId, totalInputTokens, totalOutputTokens, Date.now() - startTime, true);
    await deps.saga.rollbackAll();
    setState(runId, "cancelled");
    if (runSessionState) runSessionState.isRunning = false;
    await saveFinalSnapshot("cancelled");
    return { totalSteps: steps, status: "cancelled", totalInputTokens, totalOutputTokens, durationMs: Date.now() - startTime };
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
      // Audit keeps full effective prompt on run.started; session history stores
      // the raw user prompt so UI optimistic dedupe and display stay correct.
      const effectivePrompt = [input.systemPrompt, prompt].filter(Boolean).join("\n\n");
      await emitEvt("run.started", {
        prompt: effectivePrompt,
        ...(startedModel ? { model: startedModel } : {}),
        ...(startedAgentName ? { agentName: startedAgentName } : {}),
        ...(startedAgentId ? { agentId: startedAgentId } : {}),
      });

      await deps.pluginManager?.fireHook("onRunStarted", { runId, prompt });

      const currentModel = runModel.model;
      await addSessionMessage(sessionId, "user", prompt,
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
      await emitEvt("turn.started", { turn: step });

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

      // Invoke prepareStep callback if provided (Vercel AI SDK pattern)
      let stepModel = runModel;
      if (input.prepareStep) {
        try {
          const prepareResult = await input.prepareStep({ step, model: runModel, messages });
          if (prepareResult?.model) {
            stepModel = prepareResult.model;
          }
        } catch (err) {
          if (typeof console !== "undefined") {
            console.warn("[run-loop] prepareStep failed, using default model:", err instanceof Error ? err.message : String(err));
          }
        }
      }

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
        runModel: stepModel,
        ...(runSessionState !== undefined ? { runSessionState } : {}),
        totalInputTokens, totalOutputTokens, finalOutput,
        ...(onLastStep ? { disableTools: true } : {}),
        toolCallRepairAttempts,
        claimRepairAttempts,
        suppressedRepairAttempts,
        forceToolChoice: forceToolChoiceNext,
        fileActionSucceeded,
        priorRecentCalls: runRecentCalls,
        emitEvent,
      });

      messages = stepResult.messages;
      totalInputTokens = stepResult.totalInputTokens;
      totalOutputTokens = stepResult.totalOutputTokens;
      finalOutput = stepResult.finalOutput;
      if (stepResult.toolCallRepairAttempts !== undefined) {
        toolCallRepairAttempts = stepResult.toolCallRepairAttempts;
      }
      if (stepResult.claimRepairAttempts !== undefined) {
        claimRepairAttempts = stepResult.claimRepairAttempts;
      }
      if (stepResult.suppressedRepairAttempts !== undefined) {
        suppressedRepairAttempts = stepResult.suppressedRepairAttempts;
      }
      forceToolChoiceNext = stepResult.forceToolChoiceNext === true;
      if (stepResult.recentCalls) {
        // Cap run-scoped history so long runs stay bounded.
        runRecentCalls = stepResult.recentCalls.length > 100
          ? stepResult.recentCalls.slice(-100)
          : stepResult.recentCalls;
      }
      if (!fileActionSucceeded && stepResult.lastStepToolOutcomes.some((o) => FILE_MUTATING_TOOLS.has(o.toolName))) {
        fileActionSucceeded = true;
      }
      if (stepResult.structuredOutput !== undefined) {
        structuredOutput = stepResult.structuredOutput;
      }

      if (stepResult.stepFailed) {
        await emitEvt("step.failed", { step, reason: stepResult.stepFailed.reason, ...(stepResult.stepFailed.error ? { error: stepResult.stepFailed.error } : {}) });
        await deps.pluginManager?.fireHook("onStepFailed", { step, reason: stepResult.stepFailed.reason, ...(stepResult.stepFailed.error ? { error: stepResult.stepFailed.error } : {}) });
      } else {
        await emitEvt("step.completed", { step, toolCallCount: stepResult.toolCallCount });
        await deps.pluginManager?.fireHook("onStepCompleted", { step, toolCallCount: stepResult.toolCallCount });
      }

      // Handle handoff — transfer control to target agent
      if (stepResult.handoff) {
        // Emit handoff event
        const currentAgentId = deps.currentAgent?.id ?? "unknown";
        await emitEvt("agent.handoff", {
          fromAgentId: currentAgentId,
          toAgentId: stepResult.handoff.targetAgentId,
          reason: stepResult.handoff.reason,
          summary: stepResult.handoff.summary,
        });

        // Break out of the loop — kernel will handle agent swap
        finalOutput = `Handoff to agent "${stepResult.handoff.targetAgentId}": ${stepResult.handoff.reason}`;
        handoffResult = stepResult.handoff;
        break;
      }

      if (stepResult.completed) {
        finalOutput = stepResult.finalOutput;
        await emitEvt("turn.end", { turn: step, reason: "completed" });
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
            return { totalSteps: step + 1, status: "failed", totalInputTokens, totalOutputTokens, durationMs: Date.now() - startTime };
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
          await emitEvt("turn.end", { turn: step, reason: "completed" });
          await emitCompleted({
            id: crypto.randomUUID(), runId, type: "run.completed",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: {
              status: "succeeded", output: finalOutput, totalSteps: step + 1,
              durationMs: Date.now() - startTime,
              stopCondition: stopReason,
              stopReason,
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
      return {
        totalSteps: step + 1,
        status: "succeeded",
        totalInputTokens,
        totalOutputTokens,
        durationMs: Date.now() - startTime,
        ...(structuredOutput !== undefined ? { structuredOutput } : {}),
      };
        }
      }
    }

    const durationMs = Date.now() - startTime;
    if (step >= runMaxSteps) {
      if (runAbort.signal.aborted) return cancelRun(step + 1);
      await emitEvt("turn.end", { turn: step, reason: "max_tokens" });
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
        return { totalSteps: step + 1, status: "succeeded", totalInputTokens, totalOutputTokens, durationMs, ...(handoffResult ? { handoff: handoffResult } : {}) };
      }
      if (runAbort.signal.aborted) return cancelRun(step + 1);
      await emitFail(runId, ctx, `Exceeded max steps (${runMaxSteps})`, step, sessionId, totalInputTokens, totalOutputTokens, durationMs);
      await deps.saga.rollbackAll();
      setState(runId, "failed");
      return { totalSteps: step, status: "failed", totalInputTokens, totalOutputTokens, durationMs };
    } else {
      if (runAbort.signal.aborted) return cancelRun(step + 1);
      await emitCompleted({
        id: crypto.randomUUID(), runId, type: "run.completed",
        occurredAt: new Date().toISOString(), traceId: ctx.traceId,
        data: {
          status: "succeeded", output: finalOutput, totalSteps: step + 1,
          durationMs,
          stopReason: "end_turn",
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
    return { totalSteps: step + 1, status: "succeeded", totalInputTokens, totalOutputTokens, durationMs: Date.now() - startTime };
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
    return { totalSteps: step + 1, status: "failed", totalInputTokens, totalOutputTokens, durationMs: failDurationMs };
  } finally {
    deps.saga.clear();
    deps.stateMachine.cleanupRun(runId, sessionId);
  }
}
