import type { RequestContext, RunId, AgentConfig, KnownRunEvent, RunEvent, EventDefinition } from "@vinhnt-sdk/schema";
import { EventRegistry } from "@vinhnt-sdk/schema";
import type { RunEventStore, SessionStore } from "../session/store.js";
import type { PluginManager } from "../plugin.js";
import type { ModelCaller } from "./model-caller.js";
import type { ToolSaga } from "./tool-saga.js";
import type { EventBus } from "../event-bus/types.js";

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
  const seq = effectivePersist ? await deps.store.getNextSequence(event.runId) : 0;
  await deps.store.append({
    ...event,
    sequence: seq,
    ...(effectivePersist === false ? { persist: false as const } : {}),
  } as RunEvent);

  if (deps.eventBus) {
    const def = ALL_EVENT_DEFS[event.type];
    if (def) {
      const meta: { traceId?: string; aggregateId?: string } = { traceId: event.traceId };
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
): Promise<void> {
  await emitEvent(deps, {
    id: crypto.randomUUID(), runId, type: "run.completed",
    occurredAt: new Date().toISOString(), traceId: ctx.traceId,
    data: {
      status: "failed", error: reason, totalSteps: steps,
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(totalInputTokens > 0 ? { inputTokens: totalInputTokens } : {}),
      ...(totalOutputTokens > 0 ? { outputTokens: totalOutputTokens } : {}),
    },
  });
  await deps.pluginManager?.fireHook("onRunCompleted", { status: "failed", error: reason });
  await updateSessionOnComplete(deps, sessionId, runId, totalInputTokens, totalOutputTokens);
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
