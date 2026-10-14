---
title: "@vinhnt-sdk/event"
description: "Typed event bus with durable replay for agentic workflows"
version: "0.4.5"
lang: "en"
type: "reference"
category: "API Reference"
sidebarLabel: "event"
---

# @vinhnt-sdk/event

A typed publish/subscribe event bus with support for durable replay, streaming, and global singleton access.

## Installation

```bash
npm install @vinhnt-sdk/event
```

## Exports

### `defineEvent`

Define (and register) an event type; duplicate types throw.

```ts
import { defineEvent } from "@vinhnt-sdk/event";
import { z } from "zod";

const UserCreated = defineEvent({
  type: "user.created",
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
});

// Durable events can be replayed from the event store
const OrderCompleted = defineEvent({
  type: "order.completed",
  durable: { version: 1, aggregate: "order" },
});
```

**Signature:** `defineEvent<T>(def: EventDefinition<T>): EventDefinition<T>`

---

### `InMemoryEventBus`

A fully-featured in-memory event bus implementing the `EventBus` interface.

```ts
import { InMemoryEventBus, defineEvent } from "@vinhnt-sdk/event";

const bus = new InMemoryEventBus();

const UserCreated = defineEvent({ type: "user.created" });

// Publish — handler receives TypedEvent<T>
bus.publish(UserCreated, { id: "123", name: "Alice" });

// Subscribe — typed handler
const unsub = bus.subscribe(UserCreated, (event) => {
  console.log("User created:", event.data);
});

// Unsubscribe
unsub();
```

**Methods:**

- `publish(def, data, meta?)` — Emit an event to all matching subscribers. `meta` accepts `traceId` / `aggregateId`.
- `subscribe(def, handler)` — Listen for a specific event definition. Returns an unsubscribe function.
- `subscribeAll(handler, namespace?)` — Listen for all events.
- `project(def, handler)` — Register a projection handler for an event definition.
- `stream(def, signal?)` — Async iterable that yields events as they are published.
- `streamWithReplay(def, aggregateId, after?, signal?)` — Replay historical events for an aggregate, then merge live events.
- `durable(def, aggregateId, after?)` — Async iterable over a durable event definition, resuming from a sequence number.

---

### `GlobalEventBus`

A singleton `InMemoryEventBus` instance shared across the application.

```ts
import { GlobalEventBus, defineEvent } from "@vinhnt-sdk/event";

const AppStarted = defineEvent({ type: "app.started" });

GlobalEventBus.publish(AppStarted, {});
GlobalEventBus.subscribe(AppStarted, () => console.log("App started"));
```

Useful for application-wide event distribution without manual instantiation.

---

## Methods Reference

### `publish(def, data, meta?)`

Emits a typed event to all matching subscribers. Synchronous — handlers execute immediately.

```ts
const OrderPlaced = defineEvent({ type: "order.placed" });

bus.publish(OrderPlaced, { orderId: "abc", total: 99.99 });
```

### `subscribe(def, handler)`

Registers a handler for a specific event definition. Returns an unsubscribe function.

```ts
const unsub = bus.subscribe(OrderPlaced, (event) => {
  processOrder(event.data.orderId);
});

// Later
unsub();
```

### `subscribeAll(handler, namespace?)`

Registers a handler that fires for every event regardless of type.

```ts
bus.subscribeAll((event) => {
  logger.debug(`Event: ${event.type}`, event.data);
});
```

### `stream(def, signal?)`

Returns an `AsyncIterable` that yields events in real-time. Blocks until the next event arrives.

```ts
for await (const event of bus.stream(UserCreated)) {
  handleUpdate(event.data);
}
```

### `streamWithReplay(def, aggregateId, after?, signal?)`

Returns an `AsyncIterable` that first replays historical events for an aggregate from durable storage, then yields live events.

```ts
for await (const event of bus.streamWithReplay(OrderCompleted, "order-123", lastSeen)) {
  processOrder(event.data);
}
```

- `aggregateId` — Aggregate whose history is replayed.
- `after` — Sequence number to start replay from (default: `-1`).

### `durable(def, aggregateId, after?)`

Creates a durable stream that persists position. Resume from the last acknowledged sequence number.

```ts
for await (const event of bus.durable(OrderCompleted, "order-123", lastSeenSequence)) {
  await processTask(event.data);
  lastSeenSequence = event.sequence;
}
```

---

## Types

### `EventBus`

Core interface for all event bus implementations.

```ts
interface EventBus {
  publish<T>(def: EventDefinition<T>, data: T, meta?: { traceId?: string; aggregateId?: string }): void;
  subscribe<T>(def: EventDefinition<T>, handler: EventHandler<T>): Unsubscribe;
  subscribeAll(handler: EventHandler, namespace?: string): Unsubscribe;
  project<T>(def: EventDefinition<T>, handler: (event: TypedEvent<T>) => void): Unsubscribe;
  stream<T>(def: EventDefinition<T>, signal?: AbortSignal): AsyncIterable<TypedEvent<T>>;
  streamWithReplay<T>(
    def: EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> },
    aggregateId: string,
    after?: number,
    signal?: AbortSignal,
  ): AsyncIterable<TypedEvent<T>>;
  durable<T>(
    def: EventDefinition<T> & { durable: NonNullable<EventDefinition["durable"]> },
    aggregateId: string,
    after?: number,
  ): AsyncIterable<TypedEvent<T>>;
}
```

### `EventDefinition`

Static metadata describing an event type, created via `defineEvent`.

```ts
interface EventDefinition<TData = unknown> {
  readonly type: string;
  readonly description?: string;
  readonly durable?: {
    readonly version: number;
    readonly aggregate: string;
  };
  readonly schema?: ZodSchema<TData>;
}
```

### `TypedEvent`

A fully materialized event instance emitted for an aggregate.

```ts
interface TypedEvent<TData = unknown> {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: string;
  readonly traceId: string;
  readonly sequence: number;
  readonly aggregateId: string;
  readonly data: TData;
}
```

### `EventHandler`

Callback function for event subscribers.

```ts
type EventHandler<T = unknown> = (event: TypedEvent<T>) => void;
```

### `Unsubscribe`

Function returned by subscribe methods to detach the handler.

```ts
type Unsubscribe = () => void;
```

## Dependencies

- `@vinhnt-sdk/schema` — Provides Zod-based event validation and `TypedEvent` types.
