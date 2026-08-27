---
title: "@vinhnt-sdk/session"
description: "Session state management and stores"
lang: "en"
type: "reference"
category: "API Reference"
version: "0.1.3"
sidebarLabel: "session"
---

# @vinhnt-sdk/session

Session state management and persistence layer for agent conversations.

## Exports

### InMemorySessionState

In-memory implementation of session state. Useful for testing and short-lived sessions.

```ts
const state = new InMemorySessionState(sessionId);
```

| Method | Description |
| --- | --- |
| `getState()` | Returns current session state |
| `updateState(partial)` | Merge partial state update |
| `reset()` | Clear all state |

### NullRunEventStore

No-op run event store that discards all events. Use when event tracking is not needed.

```ts
const store = new NullRunEventStore();
await store.append(event); // no-op
await store.list(sessionId); // returns []
```

### SessionRunCoordinator

Coordinates run execution within a session. Manages run lifecycle and concurrency.

```ts
const coordinator = new SessionRunCoordinator(config);
const run = await coordinator.startRun(session, messages);
await coordinator.completeRun(run.id);
```

### SessionRuntimeSnapshot

Readonly snapshot of the current runtime state. Provides access to session data without mutation.

```ts
const snapshot = coordinator.getSnapshot(sessionId);
console.log(snapshot.activeRuns);
console.log(snapshot.messageCount);
```

## Types

### SessionProvider

```ts
type SessionProvider = {
  getSession(id: string): Promise<Session | null>;
  createSession(config: SessionConfig): Promise<Session>;
  deleteSession(id: string): Promise<void>;
};
```

### SessionStore

```ts
type SessionStore = {
  load(id: string): Promise<SessionState | null>;
  save(id: string, state: SessionState): Promise<void>;
  list(): Promise<string[]>;
};
```

### RunEventStore

```ts
type RunEventStore = {
  append(event: RunEvent): Promise<void>;
  list(sessionId: string): Promise<RunEvent[]>;
  clear(sessionId: string): Promise<void>;
};
```

### Session

```ts
type Session = {
  id: string;
  config: SessionConfig;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
};
```

### Message

```ts
type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolResult?: ToolResult;
  timestamp: Date;
};
```

### SessionConfig

```ts
type SessionConfig = {
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  tools?: string[];
};
```

## Compaction

### ConversationCompactor

Reduces conversation length by summarizing older messages while preserving key context.

```ts
const compactor = new ConversationCompactor(config);
const summary = await compactor.compact(messages);
```

### CompressionSummary

```ts
type CompressionSummary = {
  originalCount: number;
  compressedCount: number;
  summary: string;
  retainedMessages: Message[];
};
```

## Durable Reload

### DurableReloadConfig

Configuration for durable session reload from persistent storage.

```ts
type DurableReloadConfig = {
  store: SessionStore;
  maxAge?: number;
  validate?: (state: SessionState) => boolean;
};
```

## Dependencies

- `schema` — shared type definitions and validation
