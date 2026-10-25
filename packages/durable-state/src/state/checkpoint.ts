import type { StateValues } from "./graph-state.js";
import type { TraceId } from "@vinhnt-sdk/schema";
import { CheckpointError } from "../errors.js";

/**
 * Configuration for a graph execution thread — identifies the conversation
 * and optional checkpoint namespace (for subgraphs).
 *
 * @example
 * ```typescript
 * const config: GraphConfig = {
 *   threadId: "thread_123",
 *   checkpointNs: "",          // root graph
 *   checkpointId: "cp_abc",    // specific checkpoint to resume from
 * };
 * ```
 */
export interface GraphConfig {
  /** Conversation/thread identifier — maps to vinhnt sessionId. */
  readonly threadId: string;
  /** Checkpoint namespace — "" for root, namespaced for subgraphs. */
  readonly checkpointNs?: string;
  /** Specific checkpoint id to resume from (optional). */
  readonly checkpointId?: string;
  /** Correlation id for tracing. */
  readonly traceId?: TraceId;
  /** Request id for tracing. */
  readonly requestId?: string;
  /** Metadata attached to this execution. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * A snapshot of graph state at a point in time — the durable checkpoint.
 * Contains everything needed to resume execution.
 */
export interface StateSnapshot {
  /** Current channel values. */
  readonly values: StateValues;
  /** Next node(s) to execute — empty array means completed. */
  readonly next: readonly string[];
  /** Graph configuration (thread, checkpoint namespace, ids). */
  readonly config: GraphConfig;
  /** Metadata about this snapshot (source, writes, step, etc.). */
  readonly metadata: Readonly<Record<string, unknown>>;
  /** ISO timestamp when the snapshot was created. */
  readonly createdAt: string;
  /** Parent checkpoint id — null for the first checkpoint. */
  readonly parentConfig: GraphConfig | null;
  /** Pending tasks at the snapshot point (interrupts, in-flight steps). */
  readonly tasks: readonly PendingTask[];
}

/**
 * A pending task recorded at snapshot time — used for interrupt/resume.
 */
export interface PendingTask {
  readonly id: string;
  readonly name: string;
  readonly error?: string;
  readonly interrupts: readonly InterruptRecord[];
  readonly state?: StateValues;
}

/**
 * An interrupt record — a pause point waiting for user input.
 */
export interface InterruptRecord {
  readonly id: string;
  readonly value: unknown;
  readonly resumed: boolean;
}

/**
 * Result of resuming a graph from a checkpoint with a Command.
 */
export interface ResumeResult {
  readonly snapshot: StateSnapshot;
  readonly completed: boolean;
  readonly output?: unknown;
}

/**
 * Checkpointer interface — abstract storage for graph snapshots.
 *
 * Implementations can be in-memory (dev), SQLite (production via vinhnt
 * session store), Postgres, MongoDB, Redis, etc.
 *
 * @example
 * ```typescript
 * import { SqliteCheckpointer } from "@vinhnt-sdk/durable-state-checkpoint-sqlite";
 * const checkpointer = new SqliteCheckpointer(db);
 * ```
 */
export interface Checkpointer {
  /** Save a snapshot for a thread. */
  put(config: GraphConfig, snapshot: StateSnapshot): Promise<void>;
  /** Save intermediate writes (node outputs) before the next checkpoint. */
  putWrites(config: GraphConfig, writes: readonly [string, unknown][]): Promise<void>;
  /** Get the latest snapshot for a thread. */
  getTuple(config: GraphConfig): Promise<StateSnapshot | null>;
  /** List snapshots for a thread (newest first). */
  list(threadId: string): Promise<readonly StateSnapshot[]>;
  /** Delete a snapshot (optional — may throw if not supported). */
  delete?(config: GraphConfig): Promise<void>;
}

/**
 * In-memory checkpointer — suitable for development and testing. Not durable
 * across process restarts. Use a durable implementation (SQLite, Postgres,
 * etc.) for production.
 */
export class MemoryCheckpointer implements Checkpointer {
  private readonly snapshots = new Map<string, StateSnapshot[]>();
  private readonly writes = new Map<string, readonly [string, unknown][]>();

  private key(config: GraphConfig): string {
    return `${config.threadId}|${config.checkpointNs ?? ""}`;
  }

  async put(config: GraphConfig, snapshot: StateSnapshot): Promise<void> {
    const key = this.key(config);
    const existing = this.snapshots.get(key) ?? [];
    this.snapshots.set(key, [...existing, snapshot]);
  }

  async putWrites(config: GraphConfig, writes: readonly [string, unknown][]): Promise<void> {
    const key = this.key(config);
    const existing = this.writes.get(key) ?? [];
    this.writes.set(key, [...existing, ...writes]);
  }

  async getTuple(config: GraphConfig): Promise<StateSnapshot | null> {
    const key = this.key(config);
    const snapshots = this.snapshots.get(key);
    if (snapshots === undefined || snapshots.length === 0) return null;
    return snapshots[snapshots.length - 1] ?? null;
  }

  async list(threadId: string): Promise<readonly StateSnapshot[]> {
    const results: StateSnapshot[] = [];
    for (const [key, snapshots] of this.snapshots.entries()) {
      if (key.startsWith(`${threadId}|`)) {
        results.push(...snapshots);
      }
    }
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async delete(config: GraphConfig): Promise<void> {
    this.snapshots.delete(this.key(config));
    this.writes.delete(this.key(config));
  }
}

/**
 * Create a default MemoryCheckpointer instance.
 */
export function createMemoryCheckpointer(): MemoryCheckpointer {
  return new MemoryCheckpointer();
}

/**
 * Serialize a StateSnapshot to a plain JSON-safe object.
 *
 * @internal
 */
export function serializeSnapshot(snapshot: StateSnapshot): unknown {
  return {
    values: snapshot.values,
    next: snapshot.next,
    config: snapshot.config,
    metadata: snapshot.metadata,
    createdAt: snapshot.createdAt,
    parentConfig: snapshot.parentConfig,
    tasks: snapshot.tasks,
  };
}

/**
 * Deserialize a StateSnapshot from a plain object.
 *
 * @internal
 */
export function deserializeSnapshot(raw: unknown): StateSnapshot {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new CheckpointError("Snapshot must be an object", {
      requestId: undefined,
      traceId: undefined,
    });
  }
  const v = raw as Record<string, unknown>;
  return {
    values: (v.values as StateValues) ?? {},
    next: (Array.isArray(v.next) ? v.next : []) as readonly string[],
    config: (typeof v.config === "object" && v.config !== null
      ? (v.config as GraphConfig)
      : { threadId: "" }),
    metadata: (typeof v.metadata === "object" && v.metadata !== null
      ? (v.metadata as Record<string, unknown>)
      : {}) as Readonly<Record<string, unknown>>,
    createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
    parentConfig:
      v.parentConfig === null || v.parentConfig === undefined
        ? null
        : (v.parentConfig as GraphConfig),
    tasks: (Array.isArray(v.tasks) ? v.tasks : []) as readonly PendingTask[],
  };
}

/**
 * Create a new StateSnapshot.
 */
export function createSnapshot(
  config: GraphConfig,
  values: StateValues,
  options?: {
    next?: readonly string[];
    metadata?: Record<string, unknown>;
    parentConfig?: GraphConfig | null;
    tasks?: readonly PendingTask[];
    createdAt?: string;
  },
): StateSnapshot {
  return {
    values,
    next: options?.next ?? [],
    config,
    metadata: options?.metadata ?? {},
    createdAt: options?.createdAt ?? new Date().toISOString(),
    parentConfig: options?.parentConfig ?? null,
    tasks: options?.tasks ?? [],
  };
}
