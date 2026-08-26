# @vinhnt-sdk/event

Typed event definitions and event bus for VNT Agent.

```typescript
import { defineEvent, InMemoryEventBus } from "@vinhnt-sdk/event";

const ToolExecuted = defineEvent<{ toolId: string; duration: number }>("tool.executed");

const bus = new InMemoryEventBus();
bus.subscribe(ToolExecuted, (event) => {
  console.log(`${event.data.toolId} executed in ${event.data.duration}ms`);
});

bus.publish(ToolExecuted, { toolId: "read_file", duration: 12 });
```

## Features

- `defineEvent` / `EventRegistry` — typed event definitions with optional durable config and Zod schema validation.
- Built-in events — run, step, tool, token, thinking, permission, cost, system, webhook.
- `InMemoryEventBus` — publish/subscribe, `subscribeAll`, projectors, durable replay, live streaming with `streamWithReplay`.
- `GlobalEventBus` — process-wide singleton bus with optional Redis fan-out adapter.
- `EventMigrationRegistry` — forward migration of event data between schema versions.
