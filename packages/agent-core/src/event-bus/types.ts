import type { EventDefinition, TypedEvent } from "@vinhnt-sdk/schema";

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
}
