import type { z } from "zod";

/** Static metadata describing an event type: type string, description, durability and data schema. */
export interface EventDefinition<TData = unknown> {
  readonly type: string;
  readonly description?: string;
  readonly durable?: {
    readonly version: number;
    readonly aggregate: string;
  };
  readonly schema?: z.ZodSchema<TData>;
}

/** A fully materialized event instance emitted for an aggregate. */
export interface TypedEvent<TData = unknown> {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: string;
  readonly traceId: string;
  readonly sequence: number;
  readonly aggregateId: string;
  readonly data: TData;
}


/**
 * Registry mapping event type strings to their {@link EventDefinition}s.
 * Instance-based (AGENTS.md #18): construct your own for isolated
 * registries (tests); the process-wide {@link eventRegistry} backs
 * {@link defineEvent}.
 */
export class EventRegistry {
  private readonly definitions = new Map<string, EventDefinition>();

  register<T>(def: EventDefinition<T>): EventDefinition<T> {
    if (this.definitions.has(def.type)) {
      throw new Error(`Event type "${def.type}" already registered`);
    }
    this.definitions.set(def.type, def);
    return def;
  }

  get(type: string): EventDefinition | undefined {
    return this.definitions.get(type);
  }

  getAll(): readonly EventDefinition[] {
    return Array.from(this.definitions.values());
  }

  clear(): void {
    this.definitions.clear();
  }
}

/** Process-wide default registry used by {@link defineEvent}. */
export const eventRegistry = new EventRegistry();

/** Define (and register in the default {@link eventRegistry}) an event type; duplicate types throw. */
export function defineEvent<T>(def: EventDefinition<T>): EventDefinition<T> {
  return eventRegistry.register(def);
}
