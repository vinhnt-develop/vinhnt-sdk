import type { EventDefinition, TypedEvent } from "./definition.js";
import type { EventBus, EventHandler, Unsubscribe } from "./types.js";
import { streamWithReplayMixin } from "./stream-mixin.js";

const MAX_DURABLE_EVENTS = 10_000;

type ListenerEntry = {
  type: string | "*";
  handler: EventHandler;
  namespace?: string | undefined;
};

const SUBSCRIBER_TIMEOUT_MS = 5_000;

function callHandler(handler: EventHandler, event: TypedEvent<unknown>): void {
  try {
    const result = handler(event) as unknown;
    if (result instanceof Promise) {
      void Promise.race([
        result,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Subscriber timed out")), SUBSCRIBER_TIMEOUT_MS)),
      ]).catch((err) => {
        if (typeof console !== "undefined") {
          console.warn("[EventBus] Subscriber error:", err instanceof Error ? err.message : String(err));
        }
      });
    }
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn("[EventBus] Subscriber threw:", err instanceof Error ? err.message : String(err));
    }
  }
}

/** In-process {@link EventBus} with durable event retention and sync subscriber dispatch. */
export class InMemoryEventBus implements EventBus {
  private listeners: ListenerEntry[] = [];
  private projectors: Map<string, Set<EventHandler>> = new Map();
  private durableEvents: Map<string, TypedEvent<unknown>[]> = new Map();

  publish<T>(def: EventDefinition<T>, data: T, meta?: { traceId?: string; aggregateId?: string }): void {
    const event: TypedEvent<T> = {
      id: crypto.randomUUID(),
      type: def.type,
      occurredAt: new Date().toISOString(),
      traceId: meta?.traceId ?? crypto.randomUUID(),
      aggregateId: meta?.aggregateId ?? "",
      sequence: 0,
      data,
    };

    // Store durable events for replay (bounded to prevent unbounded growth)
    if (def.durable && meta?.aggregateId) {
      const key = `${def.durable.aggregate}:${meta.aggregateId}`;
      const list = this.durableEvents.get(key) ?? [];
      list.push({ ...event, sequence: list.length });
      if (list.length > MAX_DURABLE_EVENTS) {
        list.splice(0, list.length - MAX_DURABLE_EVENTS);
      }
      this.durableEvents.set(key, list);
    }

    // Notify specific type subscribers (isolated — errors/timeouts don't cascade)
    for (const entry of this.listeners) {
      if (entry.type === "*" || entry.type === def.type) {
        if (entry.namespace !== undefined && !def.type.startsWith(entry.namespace)) continue;
        callHandler(entry.handler as EventHandler, event as TypedEvent<unknown>);
      }
    }

    // Notify projectors
    const projectors = this.projectors.get(def.type);
    if (projectors) {
      for (const handler of projectors) {
        callHandler(handler as EventHandler, event as TypedEvent<unknown>);
      }
    }
  }

  subscribe<T>(def: EventDefinition<T>, handler: EventHandler<T>): Unsubscribe {
    const entry: ListenerEntry = { type: def.type, handler: handler as EventHandler };
    this.listeners.push(entry);
    return () => {
      const idx = this.listeners.indexOf(entry);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  subscribeAll(handler: EventHandler, namespace?: string): Unsubscribe {
    const entry: ListenerEntry = { type: "*", handler, namespace };
    this.listeners.push(entry);
    return () => {
      const idx = this.listeners.indexOf(entry);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  project<T>(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): Unsubscribe {
    const handlers = this.projectors.get(def.type) ?? new Set();
    handlers.add(handler as EventHandler);
    this.projectors.set(def.type, handlers);
    return () => {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) this.projectors.delete(def.type);
    };
  }

  async *durable<T>(
    def: EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> },
    aggregateId: string,
    after?: number,
  ): AsyncIterable<TypedEvent<T>> {
    const key = `${def.durable.aggregate}:${aggregateId}`;
    const events = this.durableEvents.get(key) ?? [];

    const startSeq = (after ?? -1) + 1;
    for (let i = startSeq; i < events.length; i++) {
      yield events[i] as TypedEvent<T>;
    }
  }

  async *stream<T>(
    def: EventDefinition<T>,
    signal?: AbortSignal,
  ): AsyncIterable<TypedEvent<T>> {
    const queue: TypedEvent<T>[] = [];
    let resolve: (() => void) | null = null;
    let done = false;

    const unsubscribe = this.subscribe(def, (event) => {
      queue.push(event as TypedEvent<T>);
      if (resolve) {
        resolve();
        resolve = null;
      }
    });

    if (signal) {
      signal.addEventListener("abort", () => {
        done = true;
        unsubscribe();
        if (resolve) {
          resolve();
          resolve = null;
        }
      });
    }

    try {
      while (!done) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            resolve = r;
          });
        }
        while (queue.length > 0) {
          yield queue.shift()!;
        }
      }
    } finally {
      unsubscribe();
    }
  }

  /**
   * Stream events with durable replay + live merge.
   * First yields historical events from durable storage, then yields live events.
   * 
   * @param def - Event definition with durable config
   * @param aggregateId - Aggregate ID for durable storage
   * @param after - Sequence number to start replay from (default: -1)
   * @param signal - Optional AbortSignal for cancellation
   * @yields Historical events followed by live events
   */
  async *streamWithReplay<T>(
    def: EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> },
    aggregateId: string,
    after?: number,
    signal?: AbortSignal,
  ): AsyncIterable<TypedEvent<T>> {
    yield* streamWithReplayMixin(
      (d, aggId, a) => this.durable(d, aggId, a),
      (d, sig) => this.stream(d, sig),
      def, aggregateId, after, signal,
    );
  }

  clear(): void {
    this.listeners = [];
    this.projectors.clear();
    this.durableEvents.clear();
  }
}