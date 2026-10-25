---
title: "@vinhnt-sdk/durable-state"
description: "Durable state management — StateChannel, Reducer, Checkpointer, Interrupt/Resume, AttachmentRef"
lang: en
type: "reference"
category: "API Reference"
sidebarLabel: durable-state
version: "0.1.0-beta.0"
---

# @vinhnt-sdk/durable-state

> **Status:** BETA  
> Durable state management for agent orchestration — StateChannel, Reducer, Checkpointer, Interrupt/Resume, AttachmentRef.

This package brings **durable, checkpointable state** to vinhnt-sdk as a separate, optional package. It does **not** replace the existing `SessionRuntimeState`, `RunEventSnapshot`, or `SerializedRunState` — it runs alongside them as a channel-based state layer that can be checkpointed, time-traveled, and interrupted/resumed.

## Why a separate package?

- `@vinhnt-sdk/workflow` is lightweight orchestration primitives (`parallel`, `sequential`, `conditional`) — not stateful, no checkpointing.
- A dedicated package keeps the immutable-delta + per-channel-reducer model cleanly separated from vinhnt's mutable `SessionRuntimeState`.
- The package is dependency-light (only `@vinhnt-sdk/schema`; `@vinhnt-sdk/session` is an optional peer dep), so consumers install it only when they need durable state.

## Install

```bash
# npm
npm install @vinhnt-sdk/durable-state@beta

# pnpm
pnpm add @vinhnt-sdk/durable-state@beta
```

## Quick Start

```typescript
import {
  StateGraphBuilder,
  StateGraphExecutor,
  createChannel,
  appendReducer,
  overwriteReducer,
  createMemoryCheckpointer,
  interrupt,
  Command,
} from "@vinhnt-sdk/durable-state";
import type { MessageContentPart } from "@vinhnt-sdk/schema";

// 1. Define state schema (typed channels)
const builder = new StateGraphBuilder("my-graph", "My Graph");
builder.addChannel("messages", createChannel<MessageContentPart[]>("messages", {
  reducer: appendReducer(),
  default: [],
}));
builder.addChannel("step", createChannel<number>("step", {
  reducer: overwriteReducer(),
  default: 0,
}));
const graph = builder.build();

// 2. Create checkpointer (MemoryCheckpointer for dev; SQLite/Postgres for prod)
const checkpointer = createMemoryCheckpointer();

// 3. Create executor and register node implementations
const executor = new StateGraphExecutor(graph, checkpointer);
executor.addNode("process", async (state, config) => {
  // ... node logic, returns PartialState or Command
  return { messages: [...state.messages, { type: "text", text: "done" }] };
});

// 4. Run — threadId maps to vinhnt sessionId
const result = await executor.run("process", {
  threadId: "session_123",
  checkpointNs: "",
});

// 5. Resume from interrupt (if result.interrupt is set)
const resumed = await executor.resume(
  { threadId: "session_123", checkpointNs: "" },
  Command.resume("user approved"),
);
```

## Exports

### StateChannel & Reducer

| Export | Description |
|--------|-------------|
| `StateChannel<T, D>` | Typed channel with name, reducer, default value |
| `Reducer<S, D>` | `(current, delta) => newValue` signature |
| `Overwrite<T>` | Marker to bypass reducer and set value directly |
| `createChannel(name, default)` | Last-write-wins channel |
| `createChannelWithReducer(name, reducer, default)` | Custom reducer channel |
| `overwriteReducer()`, `appendReducer()`, `mergeReducer()` | Built-in reducers |
| `channelName(name)` | Branded channel name |

### StateGraph

| Export | Description |
|--------|-------------|
| `StateGraphBuilder` | Build typed state schema (channels + reducers) |
| `StateGraphDefinition` | Built, validated graph contract |
| `build()` | Validate and produce definition |
| `initialState(definition)` | Initialize all channels to defaults |
| `applyDelta(definition, current, delta)` | Apply partial state delta via reducers |

### Checkpointer & Snapshot

| Export | Description |
|--------|-------------|
| `GraphConfig` | Thread id, checkpoint namespace, checkpoint id |
| `StateSnapshot` | values, next, config, metadata, createdAt, parentConfig, tasks |
| `Checkpointer` | put, putWrites, getTuple, list, (delete) |
| `MemoryCheckpointer` | In-memory implementation (dev only) |
| `createMemoryCheckpointer()` | Factory |
| `createSnapshot(config, values, opts)` | Snapshot factory |

### Executor

| Export | Description |
|--------|-------------|
| `StateGraphExecutor` | Drive graph node by node, apply deltas, checkpoint |
| `StepResult` | snapshot, completed, output, interrupt |
| `GraphNode<S>` | Node function type: `(state, config) => PartialState \| Command` |

### Interrupt & Command

| Export | Description |
|--------|-------------|
| `interrupt(value, opts)` | Pause graph, throw GraphInterrupt, wait for resume |
| `Command` | `resume(value)`, `update(state)`, `goto(node)`, `graph(PARENT)` |
| `Command.resume(value)` | Resume from interrupt |
| `Command.resumeWithUpdate(value, update)` | Resume + state update |
| `Command.resumeAndGoto(value, goto)` | Resume + jump to node |
| `Command.update(update)` | State update only |
| `Command.goto(node)` | Goto only |
| `Command.PARENT` | Navigate to parent graph from subgraph |
| `isCommand(value)` | Type guard |

### Attachment / Binary Store

| Export | Description |
|--------|-------------|
| `AttachmentRef` | Lightweight ref to binary stored outside JSON |
| `BinaryAttachmentStore` | save, get, list, delete, exists |
| `InMemoryBinaryAttachmentStore` | In-memory implementation (dev only) |
| `createAttachmentRef(init)` | Factory |
| `createInMemoryBinaryAttachmentStore()` | Factory |

### Session Adapter (requires `@vinhnt-sdk/session` peer dep)

| Export | Description |
|--------|-------------|
| `runStateToSnapshot(runState, config)` | Convert `SerializedRunState` → `StateSnapshot` |
| `snapshotToRunState(snapshot)` | Convert `StateSnapshot` → `SerializedRunState` |
| `snapshotFromDefinition(definition, config)` | Build initial snapshot from graph definition |
| `applyDeltaToSnapshot(definition, snapshot, delta)` | Apply delta to snapshot via reducers |
| `SessionStoreCheckpointer` | Checkpointer backed by `RunEventStore` + `SessionStore` |

### Errors

| Export | Description |
|--------|-------------|
| `DurableStateError` | Base error (code, category, retryable, context) |
| `ChannelNotFoundError` | Channel not declared in graph |
| `CheckpointError` | Checkpoint storage failure |
| `GraphInterrupt` | Control-flow interrupt (not a failure) |
| `CommandError` | Invalid command state |
| `AttachmentRefError` | Attachment ref not resolvable |
| `isDurableStateError(value)` | Type guard |
| `hasDurableStateErrorCode(value, code)` | Structural code check |

## Design Notes

### State Model

Durable state uses **immutable deltas + per-channel reducers**. A node returns `PartialState` (updates for specific channels), and each channel's reducer merges the delta:

```
newValue = reducer(currentValue, delta)
```

Channels can use `Overwrite<T>` to bypass the reducer and replace the value entirely.

### Checkpoint / Time-Travel

`StateSnapshot` captures `values`, `next` (next nodes), `config` (thread/checkpoint ids), `metadata`, `createdAt`, `parentConfig`, and `tasks`. Listing snapshots for a thread lets you traverse checkpoints and replay from any point.

### Interrupt / Resume

`interrupt()` pauses execution and saves a checkpoint. `Command({ resume: value })` resumes from the interrupt, passing `value` back to the interrupted node. This is the cleanest durable HITL primitive — the turn ends instead of holding a process promise.

### Binary Attachments

`AttachmentRef` points to external storage (filesystem, S3, etc.). The JSON checkpoint only stores the ref, avoiding base64 bloat. Use `BinaryAttachmentStore` to save/retrieve actual bytes.

## Compatibility with vinhnt-sdk

- **Layer:** Extension (depends on `@vinhnt-sdk/schema`; `@vinhnt-sdk/session` is an optional peer dep).
- **No breaking changes** to existing packages.
- **`SerializedRunState`** remains the run-loop checkpoint; durable-state snapshots are an orthogonal channel-state checkpoint.
- **`threadId`** in `GraphConfig` maps to vinhnt `sessionId`.

## License

MIT
