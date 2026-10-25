
/**
 * A state channel — a named, typed slot in the graph's state.
 *
 * Each channel owns a slice of the graph state. When a node returns a delta
 * for a channel, the channel's reducer is applied:
 *
 *   newValue = reducer(currentValue, delta)
 *
 * Channels are immutable in the sense that the graph never mutates a channel
 * value in place; it always produces a new value via the reducer.
 *
 * @typeParam T - The channel's value type.
 *
 * @example
 * ```typescript
 * import { createChannel } from "@vinhnt-sdk/langgraph";
 *
 * const messages = createChannel<MessageContentPart[]>("messages", {
 *   reducer: (current, delta) => [...current, ...delta],
 *   default: [],
 * });
 * ```
 */
export interface StateChannel<T, UpdateT = T> {
  /** Channel name — must be unique within a state graph. */
  readonly name: string;
  /** Channel value type tag for documentation/debugging. */
  readonly type: string;
  /** Reducer function: merge current value with an incoming delta. */
  readonly reducer: (current: T, delta: UpdateT) => T;
  /** Default value used when the channel is first initialized. */
  readonly default: T;
  /** Whether the channel supports overwrite via {@link Overwrite}. */
  readonly supportsOverwrite: boolean;
}

/**
 * Marker type to bypass the reducer and set a channel value directly.
 *
 * Wrap a value in `Overwrite<T>` when a node wants to replace the entire
 * channel value instead of merging via the reducer.
 *
 * @example
 * ```typescript
 * // Replace messages entirely instead of appending
 * return { messages: Overwrite([newMessage]) };
 * ```
 */
export type Overwrite<T> = { readonly __overwriteBrand: true; readonly value: T };

/**
 * Type helper to extract the delta (update) type from a channel.
 */
export type ChannelDelta<C extends StateChannel<any, any>> = C extends StateChannel<any, infer D>
  ? D
  : never;

/**
 * Create a state channel with last-write-wins semantics (default reducer
 * replaces the value entirely).
 *
 * @typeParam T - Channel value type.
 * @param name - Unique channel name within the graph.
 * @param defaultValue - Initial value.
 * @returns A {@link StateChannel} with overwrite-only reducer.
 */
export function createChannel<T>(name: string, defaultValue: T): StateChannel<T, T> {
  return {
    name,
    type: typeof defaultValue,
    reducer: (_current, delta) => delta,
    default: defaultValue,
    supportsOverwrite: true,
  };
}

/**
 * Create a state channel with a custom merge reducer.
 *
 * @typeParam T - Channel value type.
 * @typeParam D - Delta/update type (defaults to T).
 * @param name - Unique channel name.
 * @param reducer - Merge function (current, delta) => new value.
 * @param defaultValue - Initial value.
 * @param options - Channel options.
 * @returns A {@link StateChannel}.
 */
export function createChannelWithReducer<T, D = T>(
  name: string,
  reducer: (current: T, delta: D) => T,
  defaultValue: T,
  options?: { type?: string; supportsOverwrite?: boolean },
): StateChannel<T, D> {
  return {
    name,
    type: options?.type ?? typeof defaultValue,
    reducer,
    default: defaultValue,
    supportsOverwrite: options?.supportsOverwrite ?? false,
  };
}

/**
 * Reducer type signature: merge current state with an incoming delta.
 *
 * @typeParam S - State type.
 * @typeParam D - Delta/update type.
 */
export type Reducer<S, D = S> = (current: S, delta: D) => S;

/**
 * Last-write-wins reducer — ignores current value, returns delta.
 */
export const overwriteReducer = <T>(): Reducer<T, T> => (_current, delta) => delta;

/**
 * Append reducer — concatenates delta array to current array.
 */
export const appendReducer = <T>(): Reducer<T[], T[]> => (current, delta) => [...current, ...delta];

/**
 * Merge reducer — shallow merges delta object into current object.
 */
export const mergeReducer = <T extends Record<string, unknown>>(): Reducer<T, Partial<T>> => (
  current,
  delta,
) => ({ ...current, ...delta });

/**
 * Branded type for a channel name — prevents mixing up channel names across
 * different graphs.
 */
export type ChannelName = string & { readonly __channelBrand: unique symbol };

/**
 * Create a branded channel name.
 */
export function channelName(name: string): ChannelName {
  return name as ChannelName;
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
