import type { SerializedRunState } from "@vinhnt-sdk/session";
import type { ChatMessage, MessageContentPart } from "@vinhnt-sdk/schema";
import type {
  StateSnapshot,
  GraphConfig,
  PendingTask,
  Checkpointer,
} from "./checkpoint.js";
import { createSnapshot } from "./checkpoint.js";
import { applyDelta, initialState, StateGraphDefinition } from "./graph-state.js";
import { ChannelNotFoundError } from "../errors.js";

/**
 * Convert a {@link SerializedRunState} into a {@link StateSnapshot}.
 *
 * The run state's `messages`, `step`, `toolCallCount`, `model`, `provider`,
 * `agentId`, `finalOutput` and `userContentParts` are packed into the
 * snapshot's `values` under well-known channel names so they survive
 * checkpoint/resume cycles.
 *
 * @param runState - The serialized run state to convert.
 * @param config - Graph config (threadId = sessionId).
 * @returns A StateSnapshot capturing the run state.
 */
export function runStateToSnapshot(
  runState: SerializedRunState,
  config: GraphConfig,
): StateSnapshot {
  const values: Record<string, unknown> = {
    messages: runState.messages,
    step: runState.step,
    toolCallCount: runState.toolCallCount,
    ...(runState.model !== undefined ? { model: runState.model } : {}),
    ...(runState.provider !== undefined ? { provider: runState.provider } : {}),
    ...(runState.agentId !== undefined ? { agentId: runState.agentId } : {}),
    ...(runState.totalInputTokens !== undefined
      ? { totalInputTokens: runState.totalInputTokens }
      : {}),
    ...(runState.totalOutputTokens !== undefined
      ? { totalOutputTokens: runState.totalOutputTokens }
      : {}),
    ...(runState.finalOutput !== undefined
      ? { finalOutput: runState.finalOutput }
      : {}),
    ...(runState.userContentParts !== undefined
      ? { userContentParts: runState.userContentParts }
      : {}),
  };

  const tasks: PendingTask[] = [];
  return createSnapshot(config, values, {
    next: [],
    metadata: {
      source: "run-state",
      version: runState.version,
      runId: runState.runId,
      savedAt: runState.savedAt,
    },
    parentConfig: null,
    tasks,
  });
}

/**
 * Convert a {@link StateSnapshot} back into a {@link SerializedRunState}.
 *
 * Extracts well-known channel names from `values` and maps them to the
 * run state fields. Unknown channels are dropped (they belong to the
 * dur­able-state channel layer, not the run loop).
 *
 * @param snapshot - The snapshot to convert.
 * @returns A SerializedRunState.
 */
export function snapshotToRunState(
  snapshot: StateSnapshot,
): SerializedRunState {
  const values = snapshot.values as Record<string, unknown>;
  const messages = Array.isArray(values.messages) ? values.messages : [];
  const step = typeof values.step === "number" ? values.step : 0;
  const toolCallCount =
    typeof values.toolCallCount === "number" ? values.toolCallCount : 0;

  const prompt = "";
  return {
    version: 1,
    savedAt: snapshot.createdAt,
    prompt,
    messages: messages as readonly ChatMessage[],
    step,
    toolCallCount,
    ...(typeof values.sessionId === "string" ? { sessionId: values.sessionId } : {}),
    ...(typeof snapshot.config.threadId === "string"
      ? { sessionId: snapshot.config.threadId }
      : {}),
    ...(typeof values.model === "string" ? { model: values.model } : {}),
    ...(typeof values.provider === "string" ? { provider: values.provider } : {}),
    ...(typeof values.agentId === "string" ? { agentId: values.agentId } : {}),
    ...(typeof values.totalInputTokens === "number"
      ? { totalInputTokens: values.totalInputTokens }
      : {}),
    ...(typeof values.totalOutputTokens === "number"
      ? { totalOutputTokens: values.totalOutputTokens }
      : {}),
    ...(typeof values.finalOutput === "string"
      ? { finalOutput: values.finalOutput }
      : {}),
    ...(Array.isArray(values.userContentParts)
      ? { userContentParts: values.userContentParts as readonly MessageContentPart[] }
      : {}),
  };
}

/**
 * Build an initial {@link StateSnapshot} from a {@link StateGraphDefinition}
 * and a {@link GraphConfig} — all channels set to their defaults.
 *
 * @param definition - The compiled state graph definition.
 * @param config - Graph config (threadId = sessionId).
 * @returns A StateSnapshot with default channel values.
 */
export function snapshotFromDefinition(
  definition: StateGraphDefinition,
  config: GraphConfig,
): StateSnapshot {
  return createSnapshot(config, initialState(definition), {
    next: [],
    metadata: {
      source: "definition",
      graphId: definition.id,
      graphName: definition.name,
    },
    parentConfig: null,
    tasks: [],
  });
}

/**
 * Apply a `PartialState` delta to a snapshot's values using the graph
 * definition's reducers, returning a new snapshot.
 *
 * @param definition - The compiled state graph definition.
 * @param snapshot - The current snapshot.
 * @param delta - Partial state delta to apply.
 * @returns A new snapshot with updated values.
 */
export function applyDeltaToSnapshot(
  definition: StateGraphDefinition,
  snapshot: StateSnapshot,
  delta: Record<string, unknown>,
): StateSnapshot {
  const next = applyDelta(definition, snapshot.values as Record<string, unknown>, delta);
  return createSnapshot(snapshot.config, next, {
    next: snapshot.next,
    metadata: {
      ...snapshot.metadata,
      step: ((snapshot.metadata as { step?: number }).step ?? 0) + 1,
    },
    createdAt: new Date().toISOString(),
    parentConfig: snapshot.parentConfig,
    tasks: snapshot.tasks,
  });
}

/**
 * A Checkpointer backed by a vinhnt {@link SessionStore} and {@link RunEventStore}.
 *
 * Snapshots are serialized as JSON and stored via the event store's
 * `saveSnapshot`/`getSnapshot` (per runId = threadId). The runId doubles as
 * the graph threadId, so `threadId` maps 1:1 to a durable run.
 *
 * Requires `@vinhnt-sdk/session` to be installed (peer dependency).
 */
export class SessionStoreCheckpointer implements Checkpointer {
  private readonly eventStore: {
    saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void>;
    getSnapshot(runId: string): Promise<{ state: Record<string, unknown> } | null>;
  };

  constructor(eventStore: {
    saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void>;
    getSnapshot(runId: string): Promise<{ state: Record<string, unknown> } | null>;
  }) {
    this.eventStore = eventStore;
  }

  async put(config: GraphConfig, snapshot: StateSnapshot): Promise<void> {
    const ensured = snapshot.config.checkpointId
      ? snapshot
      : {
          ...snapshot,
          config: {
            ...snapshot.config,
            checkpointId: `cp_${crypto.randomUUID()}`,
          },
        };
    await this.eventStore.saveSnapshot(config.threadId, {
      values: ensured.values,
      next: ensured.next,
      config: ensured.config,
      metadata: ensured.metadata,
      createdAt: ensured.createdAt,
      parentConfig: ensured.parentConfig,
      tasks: ensured.tasks,
    });
  }

  async putWrites(
    _config: GraphConfig,
    _writes: readonly [string, unknown][],
  ): Promise<void> {
    return;
  }

  async getTuple(config: GraphConfig): Promise<StateSnapshot | null> {
    const row = await this.eventStore.getSnapshot(config.threadId);
    if (!row) return null;
    return this.deserialize(row.state);
  }

  async list(_threadId: string): Promise<readonly StateSnapshot[]> {
    const row = await this.eventStore.getSnapshot(_threadId);
    return row ? [this.deserialize(row.state)] : [];
  }

  async delete(_config: GraphConfig): Promise<void> {
    return;
  }

  private deserialize(state: Record<string, unknown>): StateSnapshot {
    return {
      values: (state.values as Record<string, unknown>) ?? {},
      next: (Array.isArray(state.next) ? state.next : []) as readonly string[],
      config: (typeof state.config === "object" && state.config !== null
        ? (state.config as GraphConfig)
        : { threadId: "" }),
      metadata: (typeof state.metadata === "object" && state.metadata !== null
        ? (state.metadata as Record<string, unknown>)
        : {}) as Readonly<Record<string, unknown>>,
      createdAt: typeof state.createdAt === "string" ? state.createdAt : new Date().toISOString(),
      parentConfig:
        state.parentConfig === null || state.parentConfig === undefined
          ? null
          : (state.parentConfig as GraphConfig),
      tasks: (Array.isArray(state.tasks) ? state.tasks : []) as readonly PendingTask[],
    };
  }
}

/**
 * Type guard: is a value a ChannelNotFoundError?
 */
export function isChannelNotFoundError(
  value: unknown,
): value is ChannelNotFoundError {
  return value instanceof ChannelNotFoundError;
}
