---
title: "@vinhnt-sdk/event"
description: "Typed event bus with durable replay for agentic workflows"
version: "0.1.3"
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

### `InMemoryEventBus`

A fully-featured in-memory event bus implementing the `EventBus` interface. Supports publish, subscribe, stream, and durable replay.

```ts
import { InMemoryEventBus } from "@vinhnt-sdk/event";

const bus = new InMemoryEventBus();

// Publish an event
bus.publish({ type: "user.created", payload: { id: "123", name: "Alice" } });

// Subscribe to events
const unsub = bus.subscribe("user.created", (event) => {
  console.log("User created:", event.payload);
});

// Unsubscribe
unsub();
```

**Methods:**
- `publish(event: TypedEvent): void` — Emit an event to all subscribers.
- `subscribe(type: string, handler: EventHandler): Unsubscribe` — Listen for a specific event type. Returns an unsubscribe function.
- `subscribeAll(handler: EventHandler): Unsubscribe` — Listen for all event types.
- `stream(type?: string): AsyncIterable<TypedEvent>` — Returns an async iterator that yields events as they occur.
- `streamWithReplay(type?: string, options?: ReplayOptions): AsyncIterable<TypedEvent>` — Stream events with historical replay before live events.
- `durable(subscriberId: string, type?: string): DurableSubscription` — Create a durable subscription that tracks position and supports replay.

---

### `GlobalEventBus`

A singleton `InMemoryEventBus` instance shared across the application.

```ts
import { GlobalEventBus } from "@vinhnt-sdk/event";

GlobalEventBus.publish({ type: "app.started", payload: {} });
GlobalEventBus.subscribe("app.started", () => console.log("App started"));
```

Useful for application-wide event distribution without manual instantiation.

---

### `createEventDefinition`

Factory function to define a strongly-typed event with a Zod schema.

```ts
import { createEventDefinition } from "@vinhnt-sdk/event";
import { z } from "zod";

const UserCreated = createEventDefinition("user.created", z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
}));

// Type-safe publish
bus.publish(UserCreated.create({ id: "1", name: "Alice", email: "alice@example.com" }));

// Type-safe subscribe
bus.subscribe(UserCreated.type, (event) => {
  // event.payload is typed as { id: string; name: string; email: string }
});
```

**Signature:** `createEventDefinition<T>(type: string, schema: ZodSchema<T>): EventDefinition<T>`

---

## Methods Reference

### `publish(event)`

Emits a typed event to all matching subscribers. Synchronous — handlers execute immediately.

```ts
bus.publish({ type: "order.placed", payload: { orderId: "abc", total: 99.99 } });
```

### `subscribe(type, handler)`

Registers a handler for a specific event type. Returns an unsubscribe function.

```ts
const unsub = bus.subscribe("order.placed", (event) => {
  processOrder(event.payload.orderId);
});

// Later
unsub();
```

### `subscribeAll(handler)`

Registers a handler that fires for every event regardless of type.

```ts
bus.subscribeAll((event) => {
  logger.debug(`Event: ${event.type}`, event.payload);
});
```

### `stream(type?)`

Returns an `AsyncIterable` that yields events in real-time. Blocks until the next event arrives.

```ts
for await (const event of bus.stream("user.updated")) {
  handleUpdate(event.payload);
}
```

### `streamWithReplay(type?, options?)`

Returns an `AsyncIterable` that first replays historical events from the store, then yields live events.

```ts
for await (const event of bus.streamWithReplay("order.placed", { maxReplay: 50 })) {
  processOrder(event.payload);
}
```

**Options:**
- `maxReplay?: number` — Maximum historical events to replay (default: 100).
- `since?: Date` — Replay events after this timestamp.

### `durable(subscriberId, type?)`

Creates a durable subscription that persists position. Supports replay from last acknowledged position.

```ts
const durable = bus.durable("worker-1", "task.completed");

for await (const event of durable.stream()) {
  await processTask(event.payload);
  durable.ack(event.id);
}
```

---

### `streamWithReplayMixin`

A shared mixin that adds `streamWithReplay` capability to any event bus implementation.

```ts
import { streamWithReplayMixin } from "@vinhnt-sdk/event";

class CustomEventBus {
  // ... implement EventBus core methods
}

// Add replay support
Object.assign(CustomEventBus.prototype, streamWithReplayMixin);
```

---

## Types

### `EventBus`

Core interface for all event bus implementations.

```ts
interface EventBus {
  publish(event: TypedEvent): void;
  subscribe(type: string, handler: EventHandler): Unsubscribe;
  subscribeAll(handler: EventHandler): Unsubscribe;
  stream(type?: string): AsyncIterable<TypedEvent>;
  streamWithReplay(type?: string, options?: ReplayOptions): AsyncIterable<TypedEvent>;
  durable(subscriberId: string, type?: string): DurableSubscription;
}
```

### `EventDefinition`

A typed event definition created via `createEventDefinition`.

```ts
interface EventDefinition<T> {
  type: string;
  schema: ZodSchema<T>;
  create(payload: T): TypedEvent<T>;
}
```

### `TypedEvent`

Represents a published event.

```ts
interface TypedEvent<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: Date;
}
```

### `EventHandler`

Callback function for event subscribers.

```ts
type EventHandler = (event: TypedEvent) => void | Promise<void>;
```

### `Unsubscribe`

Function returned by subscribe methods to detach the handler.

```ts
type Unsubscribe = () => void;
```

### `EventBusOptions`

Configuration options for event bus creation.

```ts
interface EventBusOptions {
  maxEvents?: number;       // Max events to retain (default: 1000)
  enableReplay?: boolean;   // Enable replay storage (default: true)
  storage?: EventStorage;   // Custom storage backend
}
```

## Dependencies

- `@vinhnt-sdk/schema` — Provides Zod-based event validation and `TypedEvent` types.
