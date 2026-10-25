import type { StateGraphDefinition, StateValues, PartialState } from "./graph-state.js";
import type {
  GraphConfig,
  StateSnapshot,
  Checkpointer,
  PendingTask,
  InterruptRecord,
} from "./checkpoint.js";
import type { Command } from "./interrupt.js";
import {
  DurableStateError,
  CheckpointError,
  GraphInterrupt,
} from "../errors.js";
import { isOverwrite } from "./channel.js";

/**
 * Result of a graph execution step.
 */
export interface StepResult {
  readonly snapshot: StateSnapshot;
  readonly completed: boolean;
  readonly output?: unknown;
  readonly interrupt?: InterruptRecord;
}

/**
 * Node function type — receives current state and returns a partial delta
 * (or a Command for control flow).
 */
export type GraphNode = (
  state: StateValues,
  config: GraphConfig,
) => PartialState | Command | Promise<PartialState | Command>;

/**
 * Graph executor — drives a compiled StateGraphDefinition node by node,
 * applying deltas via reducers and checkpointing at super-step boundaries.
 */
export class StateGraphExecutor {
  private readonly definition: StateGraphDefinition;
  private readonly checkpointer: Checkpointer;
  private readonly nodes = new Map<string, GraphNode>();

  constructor(definition: StateGraphDefinition, checkpointer: Checkpointer) {
    this.definition = definition;
    this.checkpointer = checkpointer;
  }

  /** Register a node implementation by id. */
  addNode(nodeId: string, node: GraphNode): this {
    this.nodes.set(nodeId, node);
    return this;
  }

  /** Run the graph from the beginning (or from checkpointId if provided). */
  async run(
    entryNode: string,
    config: GraphConfig,
  ): Promise<StepResult> {
    let current: StateValues;
    let next: string[];
    let parentConfig: GraphConfig | null = null;

    const checkpointId = config.checkpointId;
    if (checkpointId !== undefined && checkpointId.length > 0) {
      const existing = await this.checkpointer.getTuple(config);
      if (existing === null) {
        throw new CheckpointError(
          `Checkpoint not found: ${checkpointId}`,
          { threadId: config.threadId, checkpointId },
        );
      }
      current = { ...existing.values };
      next = [...existing.next];
      parentConfig = existing.config;
    } else {
      current = this.initialState();
      next = [entryNode];
    }

    const tasks: PendingTask[] = [];
    let output: unknown;
    let completed = false;
    let interrupt: InterruptRecord | undefined;

    if (next.length === 0) {
      completed = true;
      const finalSnapshot = this.ensureCheckpointId(
        this.makeSnapshot(config, current, next, config, []),
        config,
      );
      await this.checkpointer.put(config, finalSnapshot);
      return { snapshot: finalSnapshot, completed, output: undefined, interrupt: undefined };
    }

    while (next.length > 0) {
      const nodeId = next[0]!;
      next = next.slice(1);

      const node = this.nodes.get(nodeId);
      if (node === undefined) {
        throw new DurableStateError(
          "NODE_NOT_FOUND",
          `Node "${nodeId}" not registered in graph executor`,
          {
            context: { nodeId, graphId: this.definition.id },
          },
        );
      }

      const preSnapshot = this.ensureCheckpointId(
        this.makeSnapshot(config, current, next, parentConfig, tasks),
        config,
      );
      await this.checkpointer.put(config, preSnapshot);

      try {
        const result = await node(current, config);

        if (this.isCommandLike(result)) {
          if (result.resume !== undefined) {
            if (result.update !== undefined) {
              current = this.applyDelta(current, result.update);
            }
            completed = next.length === 0;
            output = result.resume;
            continue;
          }
          if (result.goto !== undefined) {
            next = [result.goto, ...next];
            if (result.update !== undefined) {
              current = this.applyDelta(current, result.update);
            }
            completed = next.length === 0;
            continue;
          }
          if (result.update !== undefined) {
            current = this.applyDelta(current, result.update);
            completed = next.length === 0;
          }
          continue;
        }

        current = this.applyDelta(current, result);

        const postSnapshot = this.ensureCheckpointId(
          this.makeSnapshot(config, current, next, config, tasks),
          config,
        );
        await this.checkpointer.put(config, postSnapshot);

        completed = next.length === 0;
        output = result;
      } catch (err) {
        if (err instanceof GraphInterrupt) {
          interrupt = {
            id: err.interruptId,
            value: err.interruptValue,
            resumed: false,
          };
          tasks.push({
            id: err.interruptId,
            name: nodeId,
            interrupts: [{ id: err.interruptId, value: err.interruptValue, resumed: false }],
            state: current,
          });
          completed = false;
          break;
        }
        throw err;
      }
    }

    const finalSnapshot = this.ensureCheckpointId(
      this.makeSnapshot(config, current, next, config, tasks),
      config,
    );
    await this.checkpointer.put(config, finalSnapshot);

    return { snapshot: finalSnapshot, completed, output, interrupt };
  }

  /** Resume from an interrupt with a Command value. */
  async resume(
    config: GraphConfig,
    command: Command,
  ): Promise<StepResult> {
    const existing = await this.checkpointer.getTuple(config);
    if (existing === null) {
      throw new CheckpointError(
        `No checkpoint to resume from for thread ${config.threadId}`,
        { threadId: config.threadId },
      );
    }

    let current = { ...existing.values };
    let next = [...existing.next];

    if (command.update !== undefined) {
      current = this.applyDelta(current, command.update);
    }

    const tasks: PendingTask[] = existing.tasks.map((t) => ({
      ...t,
      interrupts: t.interrupts.map((i) => ({ ...i, resumed: true })),
    }));

    let output: unknown;
    let completed = next.length === 0;
    let interrupt: InterruptRecord | undefined;

    while (next.length > 0) {
      const nodeId = next[0]!;
      next = next.slice(1);

      const node = this.nodes.get(nodeId);
      if (node === undefined) {
        throw new DurableStateError(
          "NODE_NOT_FOUND",
          `Node "${nodeId}" not registered in graph executor`,
          {
            context: { nodeId, graphId: this.definition.id },
          },
        );
      }

      const preSnapshot = this.makeSnapshot(config, current, next, config, tasks);
      await this.checkpointer.put(config, preSnapshot);

      try {
        const result = await node(current, config);

        if (this.isCommandLike(result)) {
          if (result.resume !== undefined) {
            if (result.update !== undefined) {
              current = this.applyDelta(current, result.update);
            }
            completed = next.length === 0;
            output = result.resume;
            continue;
          }
          if (result.goto !== undefined) {
            next = [result.goto, ...next];
            if (result.update !== undefined) {
              current = this.applyDelta(current, result.update);
            }
            completed = next.length === 0;
            continue;
          }
          if (result.update !== undefined) {
            current = this.applyDelta(current, result.update);
            completed = next.length === 0;
          }
          continue;
        }

        current = this.applyDelta(current, result);

        const postSnapshot = this.ensureCheckpointId(
          this.makeSnapshot(config, current, next, config, tasks),
          config,
        );
        await this.checkpointer.put(config, postSnapshot);

        completed = next.length === 0;
        output = result;
      } catch (err) {
        if (err instanceof GraphInterrupt) {
          interrupt = {
            id: err.interruptId,
            value: err.interruptValue,
            resumed: false,
          };
          break;
        }
        throw err;
      }
    }

    const finalSnapshot = this.ensureCheckpointId(
      this.makeSnapshot(config, current, next, config, tasks),
      config,
    );
    await this.checkpointer.put(config, finalSnapshot);

    return { snapshot: finalSnapshot, completed, output, interrupt };
  }

  /** List all snapshots for a thread (time-travel history). */
  async history(threadId: string): Promise<readonly StateSnapshot[]> {
    return this.checkpointer.list(threadId);
  }

  private initialState(): StateValues {
    const values: Record<string, unknown> = {};
    for (const channel of this.definition.channels) {
      values[channel.name] = channel.default;
    }
    return values as StateValues;
  }

  private applyDelta(current: StateValues, delta: PartialState): StateValues {
    const next: Record<string, unknown> = { ...current };
    for (const [channelName, update] of Object.entries(delta)) {
      const channel = this.definition.channels.find((c) => c.name === channelName);
      if (channel === undefined) {
        throw new DurableStateError(
          "CHANNEL_NOT_FOUND",
          `Channel "${channelName}" not declared in graph "${this.definition.id}"`,
          {
            context: { channel: channelName, graphId: this.definition.id },
          },
        );
      }
      if (isOverwrite(update)) {
        next[channelName] = (update as { value: unknown }).value;
      } else {
        next[channelName] = channel.reducer(next[channelName], update as any);
      }
    }
    return next as StateValues;
  }

  private isCommandLike(value: unknown): value is Command {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      ("resume" in value || "update" in value || "goto" in value || "graph" in value)
    );
  }

  private makeSnapshot(
    config: GraphConfig,
    values: StateValues,
    next: string[],
    parentConfig: GraphConfig | null,
    tasks: readonly PendingTask[],
  ): StateSnapshot {
    return {
      values,
      next,
      config: { ...config },
      metadata: {
        source: "loop",
        step: next.length,
        graphId: this.definition.id,
        graphName: this.definition.name,
      },
      createdAt: new Date().toISOString(),
      parentConfig,
      tasks,
    };
  }

  /** Ensure every persisted snapshot carries a stable checkpointId for resume/time-travel. */
  private ensureCheckpointId(
    snapshot: StateSnapshot,
    _config: GraphConfig,
  ): StateSnapshot {
    if (snapshot.config.checkpointId) return snapshot;
    return {
      ...snapshot,
      config: {
        ...snapshot.config,
        checkpointId: `cp_${crypto.randomUUID()}`,
      },
    };
  }
}

