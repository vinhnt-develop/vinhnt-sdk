import type { z } from "zod";

export interface EventDefinition<TData = unknown> {
  readonly type: string;
  readonly description?: string;
  readonly durable?: {
    readonly version: number;
    readonly aggregate: string;
  };
  readonly schema?: z.ZodSchema<TData>;
}

export interface TypedEvent<TData = unknown> {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: string;
  readonly traceId: string;
  readonly sequence: number;
  readonly aggregateId: string;
  readonly data: TData;
}



export class EventRegistry {
  private static definitions = new Map<string, EventDefinition>();

  static register<T>(def: EventDefinition<T>): EventDefinition<T> {
    if (this.definitions.has(def.type)) {
      throw new Error(`Event type "${def.type}" already registered`);
    }
    this.definitions.set(def.type, def);
    return def;
  }

  static get(type: string): EventDefinition | undefined {
    return this.definitions.get(type);
  }

  static getAll(): readonly EventDefinition[] {
    return Array.from(this.definitions.values());
  }

  static clear(): void {
    this.definitions.clear();
  }
}

export function defineEvent<T>(def: EventDefinition<T>): EventDefinition<T> {
  return EventRegistry.register(def);
}
