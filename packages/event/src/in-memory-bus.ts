import type { EventDefinition, TypedEvent } from "./definition.js";
import type { EventBus, EventHandler, Unsubscribe } from "./types.js";
import { streamWithReplayMixin } from "./stream-mixin.js";
import { getLogger } from "@vinhnt-sdk/schema";

const MAX_DURABLE_EVENTS = 10_000;
/** Bound for per-subscriber stream() queues — a slow consumer must not grow memory without limit. */
const MAX_STREAM_QUEUE = 10_000;

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
        getLogger().warn("[EventBus] Subscriber error:", err instanceof Error ? err.message : String(err));
      });
    }
  } catch (err) {
    getLogger().warn("[EventBus] Subscriber threw:", err instanceof Error ? err.message : String(err));
  }
}

/** In-process {@link EventBus} with durable event retention and sync subscriber dispatch. */
export class InMemoryEventBus implements EventBus {
  private listeners: ListenerEntry[] = [];
  private projectors: Map<string, Set<EventHandler>> = new Map();
  private durableEvents: Map<string, TypedEvent<unknown>[]> = new Map();
  private sequence = 0;

  publish<T>(def: EventDefinition<T>, data: T, meta?: { traceId?: string; aggregateId?: string }): void {
    const event: TypedEvent<T> = {
      id: crypto.randomUUID(),
      type: def.type,
      occurredAt: new Date().toISOString(),
      traceId: meta?.traceId ?? crypto.randomUUID(),
      aggregateId: meta?.aggregateId ?? "",
      sequence: this.sequence++,
      data,
    };

    // Store durable events for replay (bounded to prevent unbounded growth)
    if (def.durable && meta?.aggregateId) {
      const key = `${def.durable.aggregate}:${meta.aggregateId}`;
      const list = this.durableEvents.get(key) ?? [];
      list.push(event);
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

  subscribeAll<T = unknown>(handler: EventHandler<T>, namespace?: string): Unsubscribe {
    const entry: ListenerEntry = { type: "*", handler: handler as EventHandler, namespace };
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

    // Sequence-based resume: real per-bus sequences (not list positions), so
    // trimming the bounded durable list cannot shift the resume point.
    const first = events.findIndex((e) => e.sequence > (after ?? -1));
    const start = first === -1 ? events.length : first;
    for (let i = start; i < events.length; i++) {
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
    let warnedOverflow = false;

    const unsubscribe = this.subscribe(def, (event) => {
      if (queue.length >= MAX_STREAM_QUEUE) {
        queue.shift();
        if (!warnedOverflow) {
          warnedOverflow = true;
          getLogger().warn(`[EventBus] stream() queue full (${MAX_STREAM_QUEUE}) — dropping oldest events`);
        }
      }
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
    this.sequence = 0;
  }
}