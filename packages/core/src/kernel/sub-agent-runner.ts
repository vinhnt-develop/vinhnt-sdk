import type { RequestContext, RequestId, AgentId, AgentConfig, KnownRunEvent, RunId } from "@vinhnt-sdk/schema";
import type { SessionRuntimeState } from "@vinhnt-sdk/session";
import type { RunEventStore } from "@vinhnt-sdk/session";
import type { AgentRegistry } from "../agent/agent-registry.js";
import type { ModelCaller } from "@vinhnt-sdk/llm";
import type { RunStateMachine } from "@vinhnt-sdk/step-executor";
import { createSubAgent } from "../agent/agent-factory.js";
import type { SubAgentParams } from "../agent/agent-factory.js";
import type { RunHandle } from "./kernel-types.js";
import type { RunContext } from "@vinhnt-sdk/step-executor";

export interface SubAgentRunnerDeps {
  agentRegistry: AgentRegistry;
  /** Kernel-level session state — fork source when a child has no parent run state. */
  sessionState: SessionRuntimeState | undefined;
  stateMachine: RunStateMachine;
  store: RunEventStore;
  modelCaller: ModelCaller;
  maxSubAgentDepth: number;
  currentAgentRef: { value: AgentConfig | undefined };
  currentDepthRef: { value: number };
  agentChainRef: { value: Set<AgentId> };
  runFn: (
    prompt: string,
    ctx: RequestContext,
    sessionId?: string,
    agentOverride?: AgentConfig,
    sessionState?: SessionRuntimeState,
  ) => RunHandle;
  /** Resolve the per-run context of a parent run (for depth/chain tracking). */
  readonly runContextFor?: (runId: RunId) => RunContext | undefined;
  /** Resolve the per-run session state of a parent run (fork source for children). */
  readonly runSessionStateFor?: (runId: RunId) => SessionRuntimeState | undefined;
}

/**
 * Fork a fresh child session state from the parent run's state (falling back
 * to the kernel-level state when there is no parent run).
 *
 * P5.5: the child gets its OWN state object — the parent/kernel state is never
 * wiped, swapped or restored, so a sub-agent run can no longer clobber state
 * that a concurrent session or parallel run is reading. The child starts with
 * an empty transcript but inherits the parent's context.
 */
function forkChildSession(deps: SubAgentRunnerDeps, parentRunId?: RunId): SessionRuntimeState | undefined {
  const parent = (parentRunId ? deps.runSessionStateFor?.(parentRunId) : undefined) ?? deps.sessionState;
  if (!parent) return undefined;
  const child = parent.fork();
  child.resetMessages([]);
  child.step = 0;
  child.toolCallCount = 0;
  child.isRunning = true;
  return child;
}

/**
 * Best-effort "which run is executing this call" for callers that omit an
 * explicit `parentRunId` (e.g. the workflow graph executor).
 *
 * S3: only the TOP stack entry is considered, and only while that run still
 * has a live abort controller — a stale/finished entry is never mistaken for
 * the parent. Callers that know the parent (delegate tools pass
 * `ctx.runId`) should always pass it explicitly.
 */
function topActiveRun(deps: SubAgentRunnerDeps): RunId | undefined {
  const top = deps.stateMachine.runIdStack.at(-1);
  return top !== undefined && deps.stateMachine.isActiveRun(top) ? top : undefined;
}

export async function runAgent(
  deps: SubAgentRunnerDeps,
  agentId: AgentId,
  prompt: string,
  ctx: RequestContext,
  sessionId?: string,
  parentRunId?: RunId,
  signal?: AbortSignal,
): Promise<string> {
  const resolvedParentRunId = parentRunId ?? topActiveRun(deps);
  const rc = resolvedParentRunId ? deps.runContextFor?.(resolvedParentRunId) : undefined;
  const depth = rc?.depth ?? deps.currentDepthRef.value;
  const chain = rc?.agentChain ?? deps.agentChainRef.value;
  const currentAgent = rc?.agent ?? deps.currentAgentRef.value;

  if (depth >= deps.maxSubAgentDepth) {
    throw new Error(`Sub-agent depth limit (${deps.maxSubAgentDepth}) reached. Cannot spawn more sub-agents.`);
  }

  if (chain.has(agentId)) {
    throw new Error(`Cycle detected: agent '${agentId}' is already in the call chain.`);
  }

  const prevAgent = currentAgent;
  const prevDepth = depth;

  try {
    const agent = await deps.agentRegistry.get(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' not found`);
    if (rc) {
      rc.agent = agent;
      rc.depth++;
      rc.agentChain.add(agentId);
      rc.cachedTools = null;
      rc.cachedToolsAgentId = undefined;
    } else {
      deps.currentAgentRef.value = agent;
      deps.currentDepthRef.value++;
      deps.agentChainRef.value.add(agentId);
    }

    const childCtx: RequestContext = resolvedParentRunId
      ? { ...ctx, parentRunId: resolvedParentRunId }
      : ctx;

    const childSession = forkChildSession(deps, resolvedParentRunId);
    const handle = deps.runFn(prompt, childCtx, sessionId, agent, childSession);
    // RV-20: propagate the parent run's abort to the child so a cancelled
    // parent run does not orphan a still-running sub-agent. The child handle
    // stays cancellable by its own session/stack too.
    const abortChild = () => handle.abort();
    if (signal?.aborted) {
      abortChild();
    } else {
      signal?.addEventListener("abort", abortChild, { once: true });
    }
    try {
      await handle.completed;
    } finally {
      signal?.removeEventListener("abort", abortChild);
    }

    const output = await getRunOutput(deps.store, handle.runId);
    return output;
  } finally {
    if (rc) {
      rc.agent = prevAgent;
      rc.depth = prevDepth;
      rc.agentChain.delete(agentId);
    } else {
      deps.currentAgentRef.value = prevAgent;
      deps.currentDepthRef.value = prevDepth;
      deps.agentChainRef.value.delete(agentId);
    }
  }
}

export async function runAgentsParallel(
  deps: SubAgentRunnerDeps,
  tasks: Array<{ agentId: AgentId; prompt: string }>,
  ctx: RequestContext,
  sessionId?: string,
  parentRunId?: RunId,
  signal?: AbortSignal,
): Promise<string> {
  const resolvedParentRunId = parentRunId ?? topActiveRun(deps);
  const rc = resolvedParentRunId ? deps.runContextFor?.(resolvedParentRunId) : undefined;
  const depth = rc?.depth ?? deps.currentDepthRef.value;
  const currentAgent = rc?.agent ?? deps.currentAgentRef.value;

  if (depth >= deps.maxSubAgentDepth) {
    throw new Error(`Sub-agent depth limit (${deps.maxSubAgentDepth}) reached.`);
  }

  const agents = await Promise.all(
    tasks.map((t) => deps.agentRegistry.get(t.agentId)),
  );
  for (let i = 0; i < agents.length; i++) {
    if (!agents[i]) throw new Error(`Agent '${tasks[i]!.agentId}' not found`);
  }

  const prevDepth = depth;
  // P5.5: capture the original agent ONCE before any task starts and restore
  // it once after ALL tasks settle — per-task capture/restore raced and could
  // leave a child agent (or another task's agent) behind as the final value.
  const prevAgent = rc?.agent ?? deps.currentAgentRef.value;
  if (rc) {
    rc.depth++;
  } else {
    deps.currentDepthRef.value++;
  }
  const childCtx: RequestContext = resolvedParentRunId
    ? { ...ctx, parentRunId: resolvedParentRunId }
    : ctx;

  try {
    const results = await Promise.allSettled(
      tasks.map(async (t, i) => {
        const agent = agents[i]!;
        const childSession = forkChildSession(deps, resolvedParentRunId);

        const childCtxForAgent: RequestContext = {
          ...childCtx,
          requestId: crypto.randomUUID() as RequestId,
        };

        // Each task announces its agent for the child run's duration; the
        // original value is restored in the outer finally above.
        if (rc) {
          rc.agent = agent;
          rc.cachedTools = null;
          rc.cachedToolsAgentId = undefined;
        } else {
          deps.currentAgentRef.value = agent;
        }
        const handle = deps.runFn(t.prompt, childCtxForAgent, sessionId, agent, childSession);
        // RV-20: propagate the parent run's abort so cancelled parents never
        // orphan still-running parallel sub-agents.
        const abortChild = () => handle.abort();
        if (signal?.aborted) {
          abortChild();
        } else {
          signal?.addEventListener("abort", abortChild, { once: true });
        }
        try {
          await handle.completed;
          return await getRunOutput(deps.store, handle.runId);
        } finally {
          signal?.removeEventListener("abort", abortChild);
        }
      }),
    );

    const outputs = results.map((r) => {
      if (r.status === "fulfilled") return `[OK] ${r.value}`;
      return `[ERROR] ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`;
    });

    return outputs.join("\n---\n");
  } finally {
    if (rc) {
      rc.agent = prevAgent;
      rc.depth = prevDepth;
    } else {
      deps.currentAgentRef.value = prevAgent;
      deps.currentDepthRef.value = prevDepth;
    }
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
    return { output: String(snap.state.finalOutput), status: snap.state.status ?? "completed" } as unknown as KnownRunEvent["data"];
  }
  return null;
}
