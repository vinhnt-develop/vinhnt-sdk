import type { EventDefinition, TypedEvent } from "./definition.js";

export type EventHandler<T = unknown> = (event: TypedEvent<T>) => void;
export type Unsubscribe = () => void;

export interface TypedSubscription<T = unknown> {
  readonly definition: EventDefinition<T>;
  readonly handler: EventHandler<T>;
}

export interface EventBus {
  publish<T>(def: EventDefinition<T>, data: T, meta?: { traceId?: string; aggregateId?: string }): void;

  subscribe<T>(def: EventDefinition<T>, handler: EventHandler<T>): Unsubscribe;

  subscribeAll(handler: EventHandler, namespace?: string): Unsubscribe;

  durable<T>(def: EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> }, aggregateId: string, after?: number): AsyncIterable<TypedEvent<T>>;

  project<T>(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): Unsubscribe;

  /**
   * Stream events as an async iterable. Yields events as they are published.
   * @param def - Event definition to filter by
   * @param signal - Optional AbortSignal to stop streaming
   */
  stream<T>(def: EventDefinition<T>, signal?: AbortSignal): AsyncIterable<TypedEvent<T>>;

  /**
   * Stream events with durable replay + live merge.
   * First yields historical events from durable storage, then yields live events.
   * @param def - Event definition with durable config
   * @param aggregateId - Aggregate ID for durable storage
   * @param after - Sequence number to start replay from (default: -1)
   * @param signal - Optional AbortSignal to stop streaming
   */
  streamWithReplay<T>(
    def: EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> },
    aggregateId: string,
    after?: number,
    signal?: AbortSignal,
  ): AsyncIterable<TypedEvent<T>>;
}