# @vinhnt-sdk/core

> Version: 0.1.2-beta.0 | Status: BETA

Core agent engine for vinhnt-sdk — kernel, orchestration, streaming, event bus, and circuit breaker.

## Install

```bash
# npm
npm install @vinhnt-sdk/core

# pnpm (monorepo)
pnpm add @vinhnt-sdk/core
```

## Quick Start

```typescript
import { AgentKernel } from '@vinhnt-sdk/core';
import type { ModelProvider } from '@vinhnt-sdk/schema';

// Create a simple in-memory store
class SimpleStore {
  private events: any[] = [];
  async append(event: any) { this.events.push(event); }
  async list(runId: string) { return this.events.filter(e => e.runId === runId); }
  async getNextSequence() { return 1; }
  async saveSnapshot() {}
  async getSnapshot() { return null; }
  async getSnapshotAfterSequence() { return null; }
  subscribe() { return () => {}; }
}

// Create kernel
const kernel = new AgentKernel({
  model: yourModelProvider,
  store: new SimpleStore(),
  maxSteps: 50,
});

// Create run handle
const handle = kernel.createRunHandle("Hello!", {
  sessionId: "session-123",
  agentId: "my-agent",
  userId: "user-1",
});

// Listen to events
handle.onEvent((event) => {
  console.log(event.type); // "agent.started", "agent.completed", etc.
});

// Wait for completion
const result = await handle.completed;
console.log(result.status); // "succeeded"
```

## API Reference

### Core Classes

| Export | Type | Description |
|--------|------|-------------|
| `AgentKernel` | Class | Main kernel for agent orchestration |
| `InMemoryEventBus` | Class | Typed pub/sub event bus |
| `InMemorySessionState` | Class | Session state management |
| `SessionRunCoordinator` | Class | Run coordination |
| `InMemoryAgentRegistry` | Class | Agent registry |
| `InMemoryModelRegistry` | Class | Model registry |
| `InMemoryApprovalStore` | Class | Approval storage |
| `WorkspaceManager` | Class | Workspace management |
| `Tracer` | Class | Execution tracing |

### Kernel Methods

| Method | Description |
|--------|-------------|
| `createRunHandle(prompt, ctx)` | Create a run handle with lifecycle management |
| `run(prompt, ctx)` | Start a run (legacy) |
| `streamRun(prompt, ctx)` | Stream run events |
| `reconfigure(config)` | Reconfigure kernel |

### Run Handle

```typescript
const handle = kernel.createRunHandle(prompt, {
  sessionId: "session-123",
  agentId: "my-agent",
  userId: "user-1",
});

// Properties
handle.runId;        // Run ID
handle.isRunning;    // Is running
handle.isCompleted;  // Is completed
handle.isCancelled;  // Is cancelled

// Methods
handle.onEvent(handler);  // Listen to events
handle.events();          // Async iterable of events
handle.cancel();          // Cancel run

// Await completion
const result = await handle.completed;
```

### Event Bus

```typescript
import { InMemoryEventBus } from '@vinhnt-sdk/core';

const bus = new InMemoryEventBus();

// Subscribe to events
const unsubscribe = bus.subscribe(eventDef, (event) => {
  console.log(event.type, event.data);
});

// Publish events
bus.publish(eventDef, data, { traceId: "123", aggregateId: "run-1" });

// Stream events
for await (const event of bus.stream(eventDef, abortSignal)) {
  console.log(event);
}

// Stream with replay
for await (const event of bus.streamWithReplay(eventDef, "run-1")) {
  console.log(event);
}
```

### Circuit Breaker

```typescript
// Built into kernel
const kernel = new AgentKernel({
  model: yourModelProvider,
  store: yourStore,
  maxSteps: 50,
  circuitBreaker: {
    failureThreshold: 3,
    successThreshold: 2,
    resetTimeoutMs: 30_000,
    maxRetries: 3,
    retryBackoffMs: 1000,
    maxRetryBackoffMs: 30_000,
  },
});
```

## Dependencies

- `@vinhnt-sdk/schema` workspace:*
- `@vinhnt-sdk/security` workspace:*
- `@vinhnt-sdk/knowledge` workspace:*
- `@vinhnt-sdk/tools` workspace:*
- `zod` ^4.4.3

## Peer Dependencies

None

## Usage Examples

### Basic Agent Run

```typescript
import { AgentKernel } from '@vinhnt-sdk/core';

const kernel = new AgentKernel({
  model: yourModelProvider,
  store: yourStore,
});

// Simple run
const handle = kernel.createRunHandle("Write a hello world program", {
  sessionId: "session-1",
  agentId: "coder",
  userId: "developer",
});

const result = await handle.completed;
console.log(result.output);
```

### Streaming Events

```typescript
const handle = kernel.createRunHandle("Tell me a story", {
  sessionId: "session-2",
  agentId: "storyteller",
  userId: "user-1",
});

// Stream events
for await (const event of handle.events()) {
  switch (event.type) {
    case "agent.started":
      console.log("Started:", event.prompt);
      break;
    case "model.request":
      console.log("Requesting model...");
      break;
    case "model.response":
      console.log("Model responded");
      break;
    case "agent.completed":
      console.log("Completed:", event.status);
      break;
  }
}
```

### Cancel Run

```typescript
const handle = kernel.createRunHandle("Long running task", ctx);

// Cancel after 5 seconds
setTimeout(() => handle.cancel(), 5000);

const result = await handle.completed;
if (result.status === "cancelled") {
  console.log("Run was cancelled");
}
```

## License

MIT
