import type { RunEvent, RunId, TraceId } from "@vinhnt-sdk/schema";
import type { EventDefinition, TypedEvent, EventBus } from "@vinhnt-sdk/event";
import { InMemoryEventBus } from "@vinhnt-sdk/event";
import type { RunEventStore } from "@vinhnt-sdk/session";

export class EventBusBridge {
  private bus: EventBus;
  private store: RunEventStore;

  constructor(store: RunEventStore, bus?: EventBus) {
    this.store = store;
    this.bus = bus ?? new InMemoryEventBus();
  }

  get eventBus(): EventBus {
    return this.bus;
  }

  publish<T>(def: EventDefinition<T>, data: T, meta?: { traceId?: string; aggregateId?: string }): void {
    this.bus.publish(def, data, meta);

    // Persist durable events to RunEventStore with correct sequence
    if (def.durable && meta?.aggregateId) {
      const persist = async () => {
        const event: RunEvent = {
          id: crypto.randomUUID(),
          runId: meta.aggregateId as RunId,
          sequence: 0,
          type: def.type,
          occurredAt: new Date().toISOString(),
          traceId: (meta.traceId ?? crypto.randomUUID()) as TraceId,
          data: data as Record<string, unknown>,
        };
        if (this.store.appendWithSequence) {
          await this.store.appendWithSequence(event);
        } else {
          const seq = await this.store.getNextSequence(meta.aggregateId as RunId);
          await this.store.append({ ...event, sequence: seq });
        }
      };
      persist().catch((err) => console.error("[EventBusBridge] Failed to persist event:", err));
    }
  }

  subscribe<T>(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): () => void {
    return this.bus.subscribe(def, handler);
  }

  subscribeAll(handler: (event: TypedEvent<unknown>) => void): () => void {
    return this.bus.subscribeAll(handler);
  }

  async *durable<T>(
    def: EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> },
    aggregateId: string,
    after?: number,
  ): AsyncIterable<TypedEvent<T>> {
    // Replay from store first
    if (after === undefined || after >= 0) {
      const stored = await this.store.list(aggregateId, after);
      for (const ev of stored) {
        yield { id: ev.id, type: ev.type, occurredAt: ev.occurredAt, traceId: ev.traceId, sequence: ev.sequence, aggregateId: ev.runId, data: ev.data } as TypedEvent<T>;
      }
    }
    // Then live from bus
    yield* this.bus.durable(def, aggregateId, after ?? -1);
  }
}
