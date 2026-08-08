import { EventEmitter } from "node:events";
import type { TypedEvent, EventDefinition } from "@vinhnt-sdk/schema";
import type { EventBus, EventHandler, Unsubscribe } from "./types.js";

const MAX_DURABLE_EVENTS = 10_000;

export interface RedisAdapter {
  publish(channel: string, message: string): Promise<void>;
  on(event: string, handler: (channel: string, message: string) => void): void;
  subscribe(channel: string): void;
}

declare global {
  // eslint-disable-next-line no-var
  var __vnt_global_event_bus__: GlobalEventBus | undefined;
}

let defaultInstance: GlobalEventBus | undefined;

export function getGlobalEventBus(): GlobalEventBus {
  if (!globalThis.__vnt_global_event_bus__) {
    globalThis.__vnt_global_event_bus__ = new GlobalEventBus();
  }
  return globalThis.__vnt_global_event_bus__;
}

export class GlobalEventBus implements EventBus {
  private emitter = new EventEmitter();
  private durableEvents = new Map<string, TypedEvent<unknown>[]>();
  private redisAdapter: RedisAdapter | null = null;
  private readonly id: string;

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
      sequence: 0,
      data,
    };

    this.emitter.emit(def.type, event);
    this.emitter.emit("*", event);

    if (def.durable && meta?.aggregateId) {
      const key = `${def.durable.aggregate}:${meta.aggregateId}`;
      const list = this.durableEvents.get(key) ?? [];
      list.push({ ...event, sequence: list.length });
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

  subscribeAll(handler: EventHandler, namespace?: string): Unsubscribe {
    if (namespace) {
      const namespaced: EventHandler = (event) => {
        if (event.type.startsWith(namespace)) handler(event);
      };
      this.emitter.on("*", namespaced);
      return () => { this.emitter.off("*", namespaced); };
    }
    this.emitter.on("*", handler);
    return () => {
      this.emitter.off("*", handler);
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
    const start = (after ?? -1) + 1;
    for (let i = start; i < list.length; i++) {
      yield list[i] as TypedEvent<T>;
    }
  }

  reset(): void {
    this.emitter.removeAllListeners();
    this.durableEvents.clear();
    globalThis.__vnt_global_event_bus__ = undefined;
  }
}
