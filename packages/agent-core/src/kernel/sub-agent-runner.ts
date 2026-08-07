import type { RequestContext, RequestId, AgentId, AgentConfig, KnownRunEvent } from "@vinhnt-sdk/schema";
import type { SessionRuntimeState } from "../session/session-state.js";
import type { RunEventStore } from "../session/store.js";
import type { AgentRegistry } from "../agent/agent-registry.js";
import type { ModelCaller } from "./model-caller.js";
import type { RunStateMachine } from "./run-state.js";
import { createSubAgent } from "../agent/agent-factory.js";
import type { SubAgentParams } from "../agent/agent-factory.js";
import type { RunHandle } from "./kernel-types.js";

export interface SubAgentRunnerDeps {
  agentRegistry: AgentRegistry;
  sessionState: SessionRuntimeState | undefined;
  stateMachine: RunStateMachine;
  store: RunEventStore;
  modelCaller: ModelCaller;
  maxSubAgentDepth: number;
  currentAgentRef: { value: AgentConfig | undefined };
  currentDepthRef: { value: number };
  agentChainRef: { value: Set<AgentId> };
  sessionStateRef: { value: SessionRuntimeState | undefined };
  runFn: (prompt: string, ctx: RequestContext, sessionId?: string, agentOverride?: AgentConfig) => RunHandle;
}

export async function runAgent(
  deps: SubAgentRunnerDeps,
  agentId: AgentId,
  prompt: string,
  ctx: RequestContext,
  sessionId?: string,
): Promise<string> {
  if (deps.currentDepthRef.value >= deps.maxSubAgentDepth) {
    throw new Error(`Sub-agent depth limit (${deps.maxSubAgentDepth}) reached. Cannot spawn more sub-agents.`);
  }

  if (deps.agentChainRef.value.has(agentId)) {
    throw new Error(`Cycle detected: agent '${agentId}' is already in the call chain.`);
  }

  const prevAgent = deps.currentAgentRef.value;
  const prevDepth = deps.currentDepthRef.value;
  const prevSnapshot = deps.sessionStateRef.value ? deps.sessionStateRef.value.snapshot() : undefined;

  try {
    const agent = await deps.agentRegistry.get(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' not found`);
    deps.currentAgentRef.value = agent;
    deps.currentDepthRef.value++;
    deps.agentChainRef.value.add(agentId);

    if (deps.sessionStateRef.value) {
      deps.sessionStateRef.value.resetMessages([]);
      deps.sessionStateRef.value.step = 0;
      deps.sessionStateRef.value.toolCallCount = 0;
      deps.sessionStateRef.value.isRunning = true;
    }

    const parentRunId = deps.stateMachine.runIdStack.at(-1);
    const childCtx: RequestContext = parentRunId
      ? { ...ctx, parentRunId }
      : ctx;

    const handle = deps.runFn(prompt, childCtx, sessionId, undefined);
    await handle.completed;

    const output = await getRunOutput(deps.store, handle.runId);
    return output;
  } finally {
    deps.currentAgentRef.value = prevAgent;
    deps.currentDepthRef.value = prevDepth;
    deps.agentChainRef.value.delete(agentId);

    if (deps.sessionStateRef.value && prevSnapshot) {
      deps.sessionStateRef.value.restore(prevSnapshot);
    }
  }
}

export async function runAgentsParallel(
  deps: SubAgentRunnerDeps,
  tasks: Array<{ agentId: AgentId; prompt: string }>,
  ctx: RequestContext,
  sessionId?: string,
): Promise<string> {
  if (deps.currentDepthRef.value >= deps.maxSubAgentDepth) {
    throw new Error(`Sub-agent depth limit (${deps.maxSubAgentDepth}) reached.`);
  }

  const agents = await Promise.all(
    tasks.map((t) => deps.agentRegistry.get(t.agentId)),
  );
  for (let i = 0; i < agents.length; i++) {
    if (!agents[i]) throw new Error(`Agent '${tasks[i]!.agentId}' not found`);
  }

  const prevDepth = deps.currentDepthRef.value;
  deps.currentDepthRef.value++;
  const parentRunId = deps.stateMachine.runIdStack.at(-1);
  const childCtx: RequestContext = parentRunId
    ? { ...ctx, parentRunId }
    : ctx;

  try {
    const results = await Promise.allSettled(
      tasks.map(async (t, i) => {
        const agent = agents[i]!;
        const childSession = deps.sessionStateRef.value ? deps.sessionStateRef.value.fork() : undefined;

        if (childSession) {
          childSession.resetMessages([]);
          childSession.step = 0;
          childSession.toolCallCount = 0;
          childSession.isRunning = true;
        }

        const childCtxForAgent: RequestContext = {
          ...childCtx,
          requestId: crypto.randomUUID() as RequestId,
        };

        // Snapshot parent refs for per-task isolation
        const prevSession = deps.sessionStateRef.value;
        const prevAgent = deps.currentAgentRef.value;
        deps.sessionStateRef.value = childSession;
        deps.currentAgentRef.value = agent;
        try {
          const handle = deps.runFn(t.prompt, childCtxForAgent, sessionId, agent);
          await handle.completed;
          const output = await getRunOutput(deps.store, handle.runId);
          return output;
        } finally {
          deps.sessionStateRef.value = prevSession;
          deps.currentAgentRef.value = prevAgent;
        }
      }),
    );

    const outputs = results.map((r) => {
      if (r.status === "fulfilled") return `[OK] ${r.value}`;
      return `[ERROR] ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`;
    });

    return outputs.join("\n---\n");
  } finally {
    deps.currentDepthRef.value = prevDepth;
  }
}

export function createSubAgentAndRegister(
  deps: { agentRegistry: AgentRegistry; currentAgentRef: { value: AgentConfig | undefined } },
  params: SubAgentParams,
): Promise<AgentConfig> {
  if (!deps.currentAgentRef.value) throw new Error("No current agent selected — call useAgent() first");
  const agent = createSubAgent(params, deps.currentAgentRef.value);
  return deps.agentRegistry.register(agent, deps.currentAgentRef.value.id).then(() => agent);
}

/** Load completed output efficiently using snapshots. Avoids O(n) event replay. */
export async function getRunOutput(store: RunEventStore, runId: string): Promise<string> {
  const snap = await store.getSnapshot(runId);
  if (snap?.state?.finalOutput !== undefined && snap.state.finalOutput !== "") {
    return String(snap.state.finalOutput);
  }
  const events = await store.list(runId);
  const completed = events.find((e): e is Extract<KnownRunEvent, { type: "run.completed" }> => e.type === "run.completed");
  return completed?.data.output ?? "";
}

/** Load completed event data using snapshot-optimized loading. */
export async function getCompletedEventData(store: RunEventStore, runId: string): Promise<KnownRunEvent["data"] | null> {
  const snap = await store.getSnapshot(runId);
  const afterSeq = snap?.sequence ?? 0;
  const events = await store.list(runId, afterSeq);
  const completed = events.find((e): e is Extract<KnownRunEvent, { type: "run.completed" }> => e.type === "run.completed");
  if (completed?.data) return completed.data;
  if (snap?.state?.finalOutput !== undefined) {
    return { output: String(snap.state.finalOutput), status: "completed" } as unknown as KnownRunEvent["data"];
  }
  return null;
}
