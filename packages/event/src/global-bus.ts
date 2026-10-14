import { EventEmitter } from "node:events";
import type { TypedEvent, EventDefinition } from "./definition.js";
import type { EventBus, EventHandler, Unsubscribe } from "./types.js";
import { streamWithReplayMixin } from "./stream-mixin.js";
import { getLogger } from "@vinhnt-sdk/schema";

const MAX_DURABLE_EVENTS = 10_000;
/** Bound for per-subscriber stream() queues — a slow consumer must not grow memory without limit. */
const MAX_STREAM_QUEUE = 10_000;

/** Minimal Redis pub/sub adapter contract used to bridge the global bus across processes. */
export interface RedisAdapter {
  publish(channel: string, message: string): Promise<void>;
  on(event: string, handler: (channel: string, message: string) => void): void;
  subscribe(channel: string): void;
}

declare global {
   
  var __vnt_global_event_bus__: GlobalEventBus | undefined;
}

/** Return the process-wide singleton {@link GlobalEventBus}, creating it on first use. */
export function getGlobalEventBus(): GlobalEventBus {
  if (!globalThis.__vnt_global_event_bus__) {
    globalThis.__vnt_global_event_bus__ = new GlobalEventBus();
  }
  return globalThis.__vnt_global_event_bus__;
}

/**
 * Process-wide {@link EventBus} backed by a Node EventEmitter, optionally
 * bridged to other processes via a {@link RedisAdapter}.
 */
export class GlobalEventBus implements EventBus {
  private emitter = new EventEmitter();
  private durableEvents = new Map<string, TypedEvent<unknown>[]>();
  private redisAdapter: RedisAdapter | null = null;
  private readonly id: string;
  private sequence = 0;

  constructor(id?: string) {
    this.id = id ?? `global-${crypto.randomUUID().slice(0, 8)}`;
    this.emitter.setMaxListeners(Infinity);
  }

  getId(): string {
    return this.id;
  }

  setRedisAdapter(adapter: RedisAdapter): void {
    this.redisAdapter = adapter;
    adapter.on("message", (channel: string, message: string) => {
      if (channel !== "vnt:events") return;
      try {
        const parsed = JSON.parse(message) as TypedEvent;
        this.emitter.emit(parsed.type, parsed);
        this.emitter.emit("*", parsed);
      } catch {
        // ignore malformed messages
      }
    });
    adapter.subscribe("vnt:events");
  }

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

    this.emitter.emit(def.type, event);
    this.emitter.emit("*", event);

    if (def.durable && meta?.aggregateId) {
      const key = `${def.durable.aggregate}:${meta.aggregateId}`;
      const list = this.durableEvents.get(key) ?? [];
      list.push(event);
      if (list.length > MAX_DURABLE_EVENTS) {
        list.splice(0, list.length - MAX_DURABLE_EVENTS);
      }
      this.durableEvents.set(key, list);
    }

    this.redisAdapter?.publish("vnt:events", JSON.stringify(event)).catch(() => {});
  }

  subscribe<T>(def: EventDefinition<T>, handler: EventHandler<T>): Unsubscribe {
    this.emitter.on(def.type, handler);
    return () => {
      this.emitter.off(def.type, handler);
    };
  }

  subscribeAll<T = unknown>(handler: EventHandler<T>, namespace?: string): Unsubscribe {
    if (namespace) {
      const namespaced: EventHandler = (event) => {
        if (event.type.startsWith(namespace)) handler(event as TypedEvent<T>);
      };
      this.emitter.on("*", namespaced);
      return () => { this.emitter.off("*", namespaced); };
    }
    this.emitter.on("*", handler as EventHandler);
    return () => {
      this.emitter.off("*", handler as EventHandler);
    };
  }

  project<T>(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): Unsubscribe {
    return this.subscribe(def, handler as EventHandler<T>);
  }

  async *durable<T>(
    def: EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> },
    aggregateId: string,
    after?: number,
  ): AsyncIterable<TypedEvent<T>> {
    const key = `${def.durable.aggregate}:${aggregateId}`;
    const list = this.durableEvents.get(key) ?? [];
    // Sequence-based resume: real per-bus sequences (not list positions), so
    // trimming the bounded durable list cannot shift the resume point.
    const first = list.findIndex((e) => e.sequence > (after ?? -1));
    const start = first === -1 ? list.length : first;
    for (let i = start; i < list.length; i++) {
      yield list[i] as TypedEvent<T>;
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

    const handler: EventHandler<T> = (event) => {
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
    };

    this.emitter.on(def.type, handler);

    if (signal) {
      signal.addEventListener("abort", () => {
        done = true;
        this.emitter.off(def.type, handler);
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
      this.emitter.off(def.type, handler);
    }
  }

  /**
   * Stream events with durable replay + live merge.
   * First yields historical events from durable storage, then yields live events.
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

  reset(): void {
    this.emitter.removeAllListeners();
    this.durableEvents.clear();
    this.sequence = 0;
    globalThis.__vnt_global_event_bus__ = undefined;
  }
}