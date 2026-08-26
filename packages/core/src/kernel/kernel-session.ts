import type { RequestContext, RunId, AgentConfig, KnownRunEvent, RunEvent } from "@vinhnt-sdk/schema";
import { EventRegistry } from "@vinhnt-sdk/event";
import type { EventDefinition, EventBus } from "@vinhnt-sdk/event";
import type { RunEventStore, SessionStore } from "@vinhnt-sdk/session";
import type { PluginManager } from "../plugin.js";
import type { ModelCaller } from "@vinhnt-sdk/llm";
import type { ToolSaga } from "@vinhnt-sdk/tools";

export interface KernelSessionDeps {
  store: RunEventStore;
  eventBus?: EventBus;
  pluginManager?: PluginManager;
  sessionStore?: SessionStore;
  modelCaller: ModelCaller;
  saga: ToolSaga;
  noStore?: boolean;
}

/** Auto-generated from EventRegistry — all events with aggregate=runId */
const ALL_EVENT_DEFS: Record<string, EventDefinition> = Object.fromEntries(
  EventRegistry.getAll()
    .filter((def) => def.durable?.aggregate === "runId")
    .map((def) => [def.type, def])
);

export async function emitEvent(deps: KernelSessionDeps, event: Omit<KnownRunEvent, "sequence">, persist = true): Promise<void> {
  const effectivePersist = deps.noStore ? false : persist;
  let seq: number;
  if (effectivePersist && deps.store.appendWithSequence) {
    // Atomic sequence allocation + append avoids the getNextSequence/append
    // race that could drop a concurrent event assigned the same sequence.
    seq = await deps.store.appendWithSequence({ ...event, sequence: 0 } as RunEvent);
  } else {
    seq = effectivePersist ? await deps.store.getNextSequence(event.runId) : 0;
    await deps.store.append({
      ...event,
      sequence: seq,
      ...(effectivePersist === false ? { persist: false as const } : {}),
    } as RunEvent);
  }

  if (deps.eventBus) {
    const def = ALL_EVENT_DEFS[event.type];
    if (def) {
const meta: { traceId?: string; aggregateId?: string } = { ...(event.traceId !== undefined ? { traceId: event.traceId } : {}) };
      if ("runId" in event) meta.aggregateId = (event as { runId: string }).runId;
      deps.eventBus.publish(def, event.data, meta);
    }
  }
}

export async function addSessionMessage(
  deps: KernelSessionDeps,
  sessionId: string | undefined,
  role: string,
  content: string,
  extra?: { toolCallId?: string; tokens?: { input: number; output: number; reasoning?: number }; model?: string; cost?: number },
): Promise<void> {
  if (!sessionId || !deps.sessionStore || deps.noStore) return;
  await deps.sessionStore.addMessage(sessionId, role, content, extra?.toolCallId, extra?.tokens, extra?.model, extra?.cost)
    .catch((err) => { console.warn("[kernel] Failed to add session message:", err); });
}

export async function updateSessionOnComplete(
  deps: KernelSessionDeps,
  sessionId: string | undefined,
  runId: RunId,
  totalInputTokens: number,
  totalOutputTokens: number,
): Promise<void> {
  if (!sessionId || !deps.sessionStore || deps.noStore) return;
  const runModel = deps.modelCaller.getActiveModel(runId);
  const modelName = runModel.model;
  const totalCost = deps.modelCaller.calculateCost(totalInputTokens, totalOutputTokens, runModel);
  await deps.sessionStore.updateSession(sessionId, {
    ...(modelName ? { model: modelName } : {}),
    ...(totalInputTokens > 0 ? { inputTokens: totalInputTokens } : {}),
    ...(totalOutputTokens > 0 ? { outputTokens: totalOutputTokens } : {}),
    ...(totalCost !== undefined ? { cost: totalCost } : {}),
  }).catch((err) => { console.warn("[kernel] Session update failed:", err); });
}

function computeSessionUpdates(
  deps: KernelSessionDeps,
  runId: RunId,
  totalInputTokens: number,
  totalOutputTokens: number,
): Record<string, unknown> {
  const runModel = deps.modelCaller.getActiveModel(runId);
  const modelName = runModel.model;
  const totalCost = deps.modelCaller.calculateCost(totalInputTokens, totalOutputTokens, runModel);
  return {
    ...(modelName ? { model: modelName } : {}),
    ...(totalInputTokens > 0 ? { inputTokens: totalInputTokens } : {}),
    ...(totalOutputTokens > 0 ? { outputTokens: totalOutputTokens } : {}),
    ...(totalCost !== undefined ? { cost: totalCost } : {}),
  };
}

function publishEvent(deps: KernelSessionDeps, event: { type: string; traceId?: string }): void {
  if (!deps.eventBus) return;
  const def = ALL_EVENT_DEFS[event.type];
  if (def) {
    const meta: { traceId?: string; aggregateId?: string } = { ...(event.traceId !== undefined ? { traceId: event.traceId } : {}) };
    if ("runId" in event) meta.aggregateId = (event as { runId: string }).runId;
    deps.eventBus.publish(def, (event as { data?: unknown }).data ?? {}, meta);
  }
}

/**
 * Atomically persist a terminal run event (e.g. `run.completed`) together with
 * the session terminal stats (model/tokens/cost) when the store supports
 * {@link RunEventStore.appendTransactional}. When it does not, the session is
 * updated BEFORE the event is emitted — closing the crash gap where a process
 * dies between the two writes and terminal stats are lost.
 */
export async function emitCompletedWithSession(
  deps: KernelSessionDeps,
  event: Omit<KnownRunEvent, "sequence">,
  sessionId: string | undefined,
  runId: RunId,
  totalInputTokens: number,
  totalOutputTokens: number,
  _status: string,
): Promise<void> {
  const persist = deps.noStore ? false : true;
  const updates = computeSessionUpdates(deps, runId, totalInputTokens, totalOutputTokens);
  const hasSessionWrite = Boolean(sessionId && deps.sessionStore && !deps.noStore && Object.keys(updates).length > 0);

  if (persist && hasSessionWrite && deps.store.appendTransactional) {
    // Allocate the sequence, then write event + session update in ONE atomic op.
    const seq = await deps.store.getNextSequence(event.runId);
    await deps.store.appendTransactional(
      { ...event, sequence: seq } as RunEvent,
      { sessionId: sessionId!, updates },
    );
    publishEvent(deps, event as { type: string; traceId?: string });
    return;
  }

  // Fallback: persist terminal stats FIRST, then emit — a crash in between keeps
  // the session stats and leaves the run recoverable (no terminal event yet).
  if (hasSessionWrite) {
    await deps.sessionStore!.updateSession(sessionId!, updates)
      .catch((err) => { console.warn("[kernel] Session update failed:", err); });
  }
  await emitEvent(deps, event, persist);
}

export async function emitFail(
  deps: KernelSessionDeps,
  runId: RunId,
  ctx: RequestContext,
  reason: string,
  steps: number,
  sessionId?: string,
  totalInputTokens = 0,
  totalOutputTokens = 0,
  durationMs?: number,
  cancelled = false,
): Promise<void> {
  const event: Omit<KnownRunEvent, "sequence"> = {
    id: crypto.randomUUID(), runId, type: "run.completed",
    occurredAt: new Date().toISOString(), traceId: ctx.traceId,
    data: {
      status: "failed", error: reason, totalSteps: steps,
      ...(cancelled ? { cancelled: true } : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(totalInputTokens > 0 ? { inputTokens: totalInputTokens } : {}),
      ...(totalOutputTokens > 0 ? { outputTokens: totalOutputTokens } : {}),
    },
  };
  // Terminal event + session stats written together (atomic when supported).
  await emitCompletedWithSession(deps, event, sessionId, runId, totalInputTokens, totalOutputTokens, "failed");
  await deps.pluginManager?.fireHook("onRunCompleted", { status: cancelled ? "cancelled" : "failed", error: reason });
  await deps.saga.rollbackAll();
}

const BEHAVIOUR_MODE_INSTRUCTIONS: Record<string, string> = {
  build: "You are in BUILD mode. You have full access to all tools including file edits and shell commands. Make changes to the codebase as needed.",
  plan: "You are in PLAN mode. You CANNOT modify files or execute shell commands. You can only read, search, and analyze code. Provide detailed analysis and suggestions without making changes.",
};

export function buildAgentIdentity(agent: AgentConfig | undefined): string {
  if (!agent) return "";
  const lines: string[] = [];
  lines.push(`You are "${agent.profile.name}": ${agent.profile.description}`);
  const mode = agent.permissions?.mode ?? "primary";
  if (mode === "subagent") {
    lines.push("You are a sub-agent — follow the primary agent's instructions.");
  } else if (mode === "all") {
    lines.push("You can operate as a primary agent or spawn sub-agents as needed.");
  }
  const bm = agent.behaviourMode ?? "build";
  const bmInstruction = BEHAVIOUR_MODE_INSTRUCTIONS[bm];
  if (bmInstruction) lines.push(bmInstruction);
  const caps = agent.capabilities;
  const features: string[] = [];
  if (caps.tools?.length) features.push(`tools: ${caps.tools.join(", ")}`);
  if (caps.models?.length) features.push(`models: ${caps.models.join(", ")}`);
  if (caps.streaming) features.push("streaming");
  if (caps.thinking) features.push("extended thinking");
  if (features.length > 0) lines.push(`Capabilities: ${features.join(" | ")}.`);
  return lines.join("\n");
}
