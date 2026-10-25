import type { StateChannel, Overwrite } from "./channel.js";
import { DurableStateError, ChannelNotFoundError } from "../errors.js";

/**
 * Typed state schema definition — a map of channel name to channel definition.
 *
 * This is the equivalent of LangGraph's `Annotation.Root`. Channels declared
 * here are the only writable state slots in the graph.
 *
 * @example
 * ```typescript
 * import { StateSchema, createChannel } from "@vinhnt-sdk/durable-state";
 *
 * const schema: StateSchema = {
 *   messages: createChannel<MessageContentPart[]>("messages", {
 *     reducer: appendReducer(),
 *     default: [],
 *   }),
 *   step: createChannel<number>("step", {
 *     reducer: overwriteReducer(),
 *     default: 0,
 *   }),
 * };
 * ```
 */
export interface StateSchema {
  readonly [channelName: string]: StateChannel<any, any>;
}

/**
 * Resolved state values — a map of channel name to current value.
 */
export interface StateValues {
  readonly [channelName: string]: unknown;
}

/**
 * A partial state delta — updates for specific channels only.
 *
 * Nodes return `PartialState` (or `PartialState` wrapped in `Overwrite`) to
 * update channels without replacing the entire state.
 */
export interface PartialState {
  readonly [channelName: string]: unknown | Overwrite<any>;
}

/**
 * Overwrite marker imported from channel module (re-exported for convenience).
 */
export type { Overwrite } from "./channel.js";

/**
 * Build a typed state graph definition.
 *
 * The builder collects channels, reducers, and validation rules, then
 * `build()` produces an executable graph definition.
 *
 * @example
 * ```typescript
 * import { StateGraphBuilder } from "@vinhnt-sdk/durable-state";
 *
 * const builder = new StateGraphBuilder("my-graph");
 * builder.addChannel("messages", createChannel("messages", []));
 * builder.addChannel("step", createChannel("step", 0));
 * const graph = builder.build();
 * ```
 */
export class StateGraphBuilder {
  private readonly id: string;
  private readonly name: string;
  private readonly description?: string;
  private readonly channels = new Map<string, StateChannel<any, any>>();
  private readonly reducers = new Map<string, (current: any, delta: any) => any>();

  constructor(id: string, name: string, description?: string) {
    this.id = id;
    this.name = name;
    this.description = description;
  }

  /** Register a channel in the graph state schema. */
  addChannel<T, D = T>(name: string, channel: StateChannel<T, D>): this {
    if (this.channels.has(name)) {
      throw new DurableStateError(
        "DUPLICATE_CHANNEL",
        `Channel "${name}" already registered in graph "${this.name}"`,
        { context: { name, graphId: this.id } },
      );
    }
    this.channels.set(name, channel);
    this.reducers.set(name, channel.reducer as (current: any, delta: any) => any);
    return this;
  }

  /** Override the reducer for an existing channel. */
  setReducer<T, D>(name: string, reducer: (current: T, delta: D) => T): this {
    if (!this.channels.has(name)) {
      throw new ChannelNotFoundError(name, this.id);
    }
    this.reducers.set(name, reducer as (current: any, delta: any) => any);
    return this;
  }

  /** Build and validate the state graph definition. */
  build(): StateGraphDefinition {
    if (this.channels.size === 0) {
      throw new DurableStateError(
        "EMPTY_SCHEMA",
        `Graph "${this.name}" has no channels — at least one channel is required`,
        { context: { graphId: this.id } },
      );
    }
    return {
      id: this.id,
      name: this.name,
      ...(this.description !== undefined ? { description: this.description } : {}),
      channels: [...this.channels.values()],
      reducers: [...this.reducers.entries()],
    };
  }
}

/**
 * Built, validated state graph definition — the immutable contract between
 * the graph definition and its executor/checkpointer.
 */
export interface StateGraphDefinition {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly channels: readonly StateChannel<any, any>[];
  readonly reducers: readonly [string, (current: any, delta: any) => any][];
}

/**
 * Look up a channel by name from a graph definition.
 *
 * @throws {ChannelNotFoundError} if the channel is not declared.
 */
export function findChannel(definition: StateGraphDefinition, name: string): StateChannel<any, any> {
  const channel = definition.channels.find((c) => c.name === name);
  if (channel === undefined) {
    throw new ChannelNotFoundError(name, definition.id);
  }
  return channel;
}

/**
 * Look up a reducer by channel name from a graph definition.
 */
export function findReducer(
  definition: StateGraphDefinition,
  name: string,
): (current: any, delta: any) => any {
  const entry = definition.reducers.find(([n]) => n === name);
  if (entry === undefined) {
    throw new ChannelNotFoundError(name, definition.id);
  }
  return entry[1];
}

/**
 * Initialize state values from a graph definition — every channel gets its
 * default value.
 */
export function initialState(definition: StateGraphDefinition): StateValues {
  const values: Record<string, unknown> = {};
  for (const channel of definition.channels) {
    values[channel.name] = channel.default;
  }
  return values as StateValues;
}

/**
 * Apply a partial state delta to current values, running each channel's
 * reducer. Channels not in the delta are left unchanged.
 *
 * @throws {ChannelNotFoundError} if the delta references an undeclared channel.
 */
export function applyDelta(
  definition: StateGraphDefinition,
  current: StateValues,
  delta: PartialState,
): StateValues {
  const next: Record<string, unknown> = { ...current };
  for (const [channelName, update] of Object.entries(delta)) {
    const reducer = findReducer(definition, channelName);
    if (update !== null && typeof update === "object" && "__overwriteBrand" in update) {
      // Overwrite marker — bypass reducer
      next[channelName] = (update as Overwrite<unknown>).value;
    } else {
      next[channelName] = reducer(next[channelName], update as any);
    }
  }
  return next as StateValues;
}

/**
 * Check whether a value is an Overwrite marker.
 */
export function isOverwrite(value: unknown): value is Overwrite<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "__overwriteBrand" in value
  );
}
