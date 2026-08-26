import type { EventDefinition, TypedEvent } from "./definition.js";

type DurableDef<T> = EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> };

/** Shared mixin for streamWithReplay — yields durable then live events. */
export async function* streamWithReplayMixin<T>(
  durable: (def: DurableDef<T>, aggregateId: string, after?: number) => AsyncIterable<TypedEvent<T>>,
  stream: (def: EventDefinition<T>, signal?: AbortSignal) => AsyncIterable<TypedEvent<T>>,
  def: DurableDef<T>,
  aggregateId: string,
  after?: number,
  signal?: AbortSignal,
): AsyncIterable<TypedEvent<T>> {
  yield* durable(def, aggregateId, after);
  yield* stream(def, signal);
}
