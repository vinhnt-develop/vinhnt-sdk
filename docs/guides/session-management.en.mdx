---
title: "Session Management"
description: "Manage conversation state and sessions"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 8
---

# Session Management

vinhnt-sdk provides a session layer that tracks conversation state, message history, and run lifecycle. Sessions isolate conversations and enable features like compaction, durable reload, and multi-tenant usage.

## Session Concepts

A session groups related interactions:

| Concept | Description |
|---------|-------------|
| **Session** | A container holding messages and metadata for one conversation |
| **Message** | A single user, assistant, or system utterance |
| **Run** | One complete execution cycle from user input to final response |

```typescript
import { Session } from "vinhnt-sdk";

const session = new Session({ id: "user-123" });
session.addMessage({ role: "user", content: "Hello" });
```

## InMemorySessionState

`InMemorySessionState` stores session data in process memory. It is suitable for development and single-process deployments:

```typescript
import { InMemorySessionState } from "vinhnt-sdk";

const state = new InMemorySessionState();

// Store a session
await state.save(session);

// Retrieve a session
const loaded = await state.load("user-123");
```

For production, implement the `SessionState` interface with a database backend (Redis, PostgreSQL, etc.).

## NullRunEventStore

`NullRunEventStore` discards all run events. Use it when you do not need event history or replay:

```typescript
import { NullRunEventStore } from "@vinhnt-sdk/session";

const eventStore = new NullRunEventStore();

const kernel = new Kernel({
  session: { eventStore },
});
```

This reduces memory usage and avoids storing transient events that are not needed.

## SessionRunCoordinator

`SessionRunCoordinator` manages the lifecycle of a run within a session. It coordinates message persistence, tool execution, and response generation:

```typescript
import { SessionRunCoordinator } from "vinhnt-sdk";

const coordinator = new SessionRunCoordinator({
  session,
  kernel,
  eventStore,
});

const run = await coordinator.start({
  messages: session.getMessages(),
});

await coordinator.complete(run.id);
```

The coordinator ensures that partial runs can be resumed if the process restarts.

## Durable Reload

Durable reload restores session state from persistent storage after a crash or restart:

```typescript
import { DurableSessionReloader } from "vinhnt-sdk";

const reloader = new DurableSessionReloader({ state: persistentState });

// On startup, reload active sessions
const sessions = await reloader.reloadAll();

for (const session of sessions) {
  console.log(`Resumed session ${session.id} with ${session.messageCount} messages`);
}
```

Combine with `SessionRunCoordinator` to resume interrupted runs automatically.

## Session Compaction

Long conversations consume increasing context window space. Session compaction summarizes older messages to free tokens:

```typescript
import { ContextCompressor, LlmCompactor } from "vinhnt-sdk";

const compactor = new LlmCompactor({
  model: "gpt-4",
  targetTokens: 2000,
});

const compressor = new ContextCompressor({ compactor });

// Compress session messages
const compressed = await compressor.compress(session.getMessages());
session.setMessages(compressed);
```

| Component | Role |
|-----------|------|
| `ContextCompressor` | Orchestrates compression strategy and message selection |
| `LlmCompactor` | Uses an LLM to generate summaries of older messages |

Configure compression thresholds to trigger automatically when message count or token usage exceeds a limit.

## Multi-Session Management

Manage multiple concurrent sessions with a session manager:

```typescript
import { SessionManager } from "vinhnt-sdk";

const manager = new SessionManager({ state: persistentState });

// Create or retrieve sessions
const sessionA = await manager.getOrCreate("tenant-a");
const sessionB = await manager.getOrCreate("tenant-b");

// Run independent conversations
await coordinator.start({ session: sessionA, messages: [...] });
await coordinator.start({ session: sessionB, messages: [...] });

// List active sessions
const active = await manager.listActive();
```

Each session is fully isolated. Messages, permissions, and run state do not leak between sessions.
