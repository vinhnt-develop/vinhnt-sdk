import type { RunId, RequestContext, KnownRunEvent, RequestId } from "@vinhnt-sdk/schema";
import { sanitizeEnv } from "@vinhnt-sdk/guard";
import type { ToolContext, ToolRisk, QuestionStore, QuestionRequest, QuestionReply, PlanApprovalStore, PlanApprovalRequest, PlanApprovalReply } from "@vinhnt-sdk/tools";
import type { StepExecutorPluginHooks } from "./hooks.js";
import type { PermissionGate } from "./permission-gate.js";
import type { ToolExecutionPlan } from "./step-executor.js";
import type { AgentConfig } from "@vinhnt-sdk/schema";

/** Dependencies required by {@link buildToolContext}. */
export interface ToolContextBuilderDeps {
  readonly pluginManager: StepExecutorPluginHooks | undefined;
  readonly permissionGate: PermissionGate;
  readonly currentAgent: AgentConfig | undefined;
  /** Tool risk used to evaluate the tool's own `ctx.ask` against the gate. */
  readonly toolRisk: ToolRisk;
  /** Resolved workspace root for this run (per-run override or kernel default). */
  readonly workspaceRoot: string | undefined;
  /** P3.3: effective sandbox scope from kernel config (`sandbox.mode`). */
  readonly sandboxScope?: string | undefined;
  /** P7.1: sanitizer truncation cap from `ContextBudget.sanitizeLimitChars`. */
  readonly sanitizeLimitChars?: number | undefined;
  /** Store backing the `question` tool's durable request/reply path. */
  readonly questionStore?: QuestionStore | undefined;
  /** Default timeout (ms) for a question wait; omitted → store default. */
  readonly questionTimeoutMs?: number | undefined;
  /** Store backing the `submit_plan` tool's durable request/reply path. */
  readonly planStore?: PlanApprovalStore | undefined;
  /** Default timeout (ms) for a plan review wait; omitted → store default. */
  readonly planTimeoutMs?: number | undefined;
  /** Persist + publish a durable run event (used to emit question.* / plan.* events). */
  readonly emitEvent?: ((event: Omit<KnownRunEvent, "sequence">) => Promise<void>) | undefined;
}

/** Mutable ref through which tools attach observability metadata. */
export interface MetadataRef {
  current?: Record<string, unknown> | undefined;
}

export async function buildToolContext(
  tc: ToolExecutionPlan,
  runId: RunId,
  sessionId: string | undefined,
  ctx: RequestContext,
  runAbort: AbortController,
  compensationRef: { current: (() => Promise<void>) | null },
  metadataRef: MetadataRef,
  deps: ToolContextBuilderDeps,
): Promise<ToolContext> {
  // P1-G: default env is the sanitized whitelist, never raw process.env.
  let shellEnv: Record<string, string> = sanitizeEnv();
  const shellEnvResult = await deps.pluginManager?.fireHook("onShellEnv", { env: {} });
  if (shellEnvResult?.modified?.env) {
    shellEnv = { ...shellEnv, ...shellEnvResult.modified.env };
  }
  metadataRef.current = undefined;
  return {
    sessionId: sessionId ?? "",
    runId,
    agentId: deps.currentAgent?.id ?? "",
    agentName: deps.currentAgent?.profile.name ?? "",
    signal: runAbort.signal,
    env: shellEnv,
    parentContext: ctx,
    ...(deps.workspaceRoot !== undefined ? { workspaceRoot: deps.workspaceRoot } : {}),
    ...(deps.sandboxScope !== undefined ? { sandboxScope: deps.sandboxScope } : {}),
    ...(deps.sanitizeLimitChars !== undefined ? { sanitizeLimitChars: deps.sanitizeLimitChars } : {}),
    // P1-H: single approval path — gate decide first (saved patterns / rules),
    // then prompt via the approval store passing savePatterns for "always".
    ask: async (askInput) => {
      const decision = deps.permissionGate.checkTool(
        tc.toolName, deps.toolRisk, tc.args as Record<string, unknown>, deps.currentAgent,
      );
      if (decision.allowed) return "once";
      // Deny rules must always win over any previously saved approval — a
      // per-tool approval must not resurrect a tool that is now deny-listed.
      if (!decision.needsApproval) return "reject";
      if (deps.permissionGate.checkSavedApproval(tc.toolName, tc.args as Record<string, unknown>, deps.currentAgent?.id)) return "once";
      // Rejections are terminal — never re-prompt for an already-rejected call.
      if (deps.permissionGate.hasSavedRejection(tc.toolName, tc.args as Record<string, unknown>, deps.currentAgent?.id)) return "reject";
      return deps.permissionGate.askForTool(
        tc.toolName, tc.toolId, runId, sessionId ?? "",
        askInput.reason, deps.currentAgent?.id ?? "",
        ctx.traceId, deps.pluginManager,
        askInput.savePatterns, runAbort.signal,
        // G5: hand the classifier what it needs (risk floor asks only —
        // `source` comes from the checkTool result above). Also forward the
        // caller's reply observer so user feedback (reject reason) survives.
        {
          risk: deps.toolRisk,
          args: tc.args as Record<string, unknown>,
          source: decision.source,
          ...(askInput.onReply ? { onReply: askInput.onReply } : {}),
        },
      );
    },
    // Durable HITL question: emit `question.requested`, await the store, then
    // emit `question.replied`. Mirrors the permission ask path but keyed on a
    // single batch request and resolved via the app's QuestionStore.
    askQuestion: async (input) => {
      const requestId = crypto.randomUUID() as RequestId;
      const request: QuestionRequest = {
        requestId,
        runId,
        sessionId: sessionId ?? "",
        questions: input.questions,
        ...(input.allowCustom !== undefined ? { allowCustom: input.allowCustom } : {}),
        ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
      };

      await deps.emitEvent?.({
        id: crypto.randomUUID(), runId, type: "question.requested",
        occurredAt: new Date().toISOString(), traceId: ctx.traceId,
        data: {
          requestId,
          ...(sessionId !== undefined ? { sessionId } : {}),
          questions: input.questions,
          ...(input.allowCustom !== undefined ? { allowCustom: input.allowCustom } : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
        },
      });

      let reply: QuestionReply = { action: "cancel" };
      if (deps.questionStore) {
        const timeoutMs = input.timeoutMs ?? deps.questionTimeoutMs;
        try {
          reply = await deps.questionStore.awaitReply(request, {
            signal: runAbort.signal,
            ...(timeoutMs !== undefined ? { timeoutMs } : {}),
          });
        } catch (err) {
          // Run aborted / timed out → treat as cancelled but still emit the
          // reply so the UI clears its pending question card.
          const isAbort =
            err instanceof DOMException
              ? err.name === "AbortError"
              : err instanceof Error && err.name === "AbortError";
          reply = { action: "cancel" };
          if (!isAbort) throw err;
        }
      }

      await deps.emitEvent?.({
        id: crypto.randomUUID(), runId, type: "question.replied",
        occurredAt: new Date().toISOString(), traceId: ctx.traceId,
        data: {
          requestId,
          action: reply.action,
          ...(reply.answers !== undefined ? { answers: reply.answers } : {}),
        },
      });

      return reply;
    },
    // Durable HITL plan review: emit `plan.requested`, await the store, then
    // emit `plan.replied`. Mirrors the question path, resolved via the app's
    // PlanApprovalStore.
    askPlan: async (input) => {
      const requestId = crypto.randomUUID() as RequestId;
      const request: PlanApprovalRequest = {
        requestId,
        runId,
        sessionId: sessionId ?? "",
        steps: input.steps,
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
        ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
      };

      await deps.emitEvent?.({
        id: crypto.randomUUID(), runId, type: "plan.requested",
        occurredAt: new Date().toISOString(), traceId: ctx.traceId,
        data: {
          requestId,
          ...(sessionId !== undefined ? { sessionId } : {}),
          steps: input.steps,
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
        },
      });

      let reply: PlanApprovalReply = { decision: "cancel" };
      if (deps.planStore) {
        const timeoutMs = input.timeoutMs ?? deps.planTimeoutMs;
        try {
          reply = await deps.planStore.awaitReply(request, {
            signal: runAbort.signal,
            ...(timeoutMs !== undefined ? { timeoutMs } : {}),
          });
        } catch (err) {
          // Run aborted / timed out → treat as cancelled but still emit the
          // reply so the UI clears its pending plan card.
          const isAbort =
            err instanceof DOMException
              ? err.name === "AbortError"
              : err instanceof Error && err.name === "AbortError";
          reply = { decision: "cancel" };
          if (!isAbort) throw err;
        }
      }

      await deps.emitEvent?.({
        id: crypto.randomUUID(), runId, type: "plan.replied",
        occurredAt: new Date().toISOString(), traceId: ctx.traceId,
        data: {
          requestId,
          decision: reply.decision,
          ...(reply.feedback !== undefined ? { feedback: reply.feedback } : {}),
        },
      });

      return reply;
    },
    // Generative UI: emit a durable `ui.surface` snapshot (non-blocking). A
    // `delete` action (empty components) removes the surface client-side.
    presentSurface: async (surface) => {
      const isDelete = surface.components.length === 0;
      await deps.emitEvent?.({
        id: crypto.randomUUID(), runId, type: "ui.surface",
        occurredAt: new Date().toISOString(), traceId: ctx.traceId,
        data: {
          surfaceId: surface.surfaceId,
          ...(sessionId !== undefined ? { sessionId } : {}),
          action: isDelete ? "delete" : "upsert",
          ...(isDelete ? {} : { surface }),
        },
      });
    },
    metadata: (input) => {
      metadataRef.current = {
        ...metadataRef.current,
        ...(input.metadata ?? {}),
        ...(input.title ? { title: input.title } : {}),
      };
    },
    setCompensation: (action) => { compensationRef.current = action; },
  };
}
