// @vinhnt-sdk/durable-state
// Durable state management for agent orchestration.
//
// This package provides durable, checkpointable state for vinhnt-sdk:
// StateChannel, Reducer, StateGraph, Checkpointer, StateSnapshot,
// interrupt()/Command(resume), and AttachmentRef (binary attachment refs
// stored outside JSON checkpoints).
//
// ## Design principles
//
// - **Library, not framework**: receives config from outside, never decides
//   for the user, no hardcoded models/URLs/pricing.
// - **Additive to vinhnt-sdk**: keeps `SessionRuntimeState`,
//   `RunEventSnapshot`, and `SerializedRunState` intact; durable-state is a
//   separate channel state that can be checkpointed independently.
// - **Binary attachments outside JSON**: `AttachmentRef` points to external
//   storage; snapshots stay small and JSON-serializable.
//
// ## Installation
//
// ```bash
// npm install @vinhnt-sdk/durable-state
// # or
// pnpm add @vinhnt-sdk/durable-state
// ```
//
// ## Quick start
//
// ```typescript
// import {
//   StateGraphBuilder,
//   StateGraphExecutor,
//   createChannel,
//   appendReducer,
//   overwriteReducer,
//   createMemoryCheckpointer,
//   interrupt,
//   Command,
// } from "@vinhnt-sdk/durable-state";
//
// // 1. Define state schema (typed channels)
// const builder = new StateGraphBuilder("my-graph", "My Graph");
// builder.addChannel("messages", createChannel<MessageContentPart[]>("messages", {
//   reducer: appendReducer(),
//   default: [],
// }));
// builder.addChannel("step", createChannel<number>("step", {
//   reducer: overwriteReducer(),
//   default: 0,
// }));
// const graph = builder.build();
//
// // 2. Create checkpointer (MemoryCheckpointer for dev; SQLite/Postgres for prod)
// const checkpointer = createMemoryCheckpointer();
//
// // 3. Create executor and register node implementations
// const executor = new StateGraphExecutor(graph, checkpointer);
// executor.addNode("process", async (state, config) => {
//   // ... node logic, returns PartialState or Command
//   return { messages: [...state.messages, { type: "text", text: "done" }] };
// });
//
// // 4. Run — threadId maps to vinhnt sessionId
// const result = await executor.run("process", {
//   threadId: "session_123",
//   checkpointNs: "",
// });
//
// // 5. Resume from interrupt (if result.interrupt is set)
// const resumed = await executor.resume(
//   { threadId: "session_123", checkpointNs: "" },
//   Command.resume("user approved"),
// );
// ```

// ===== StateChannel / Reducer =====
export type {
  StateChannel,
  Overwrite,
  ChannelDelta,
  ChannelName,
  Reducer,
} from "./state/channel.js";
export {
  createChannel,
  createChannelWithReducer,
  overwriteReducer,
  appendReducer,
  mergeReducer,
  channelName,
  isOverwrite,
} from "./state/channel.js";

// ===== StateGraph =====
export type {
  StateSchema,
  StateValues,
  PartialState,
  StateGraphDefinition,
} from "./state/graph-state.js";
export {
  StateGraphBuilder,
  findChannel,
  findReducer,
  initialState,
  applyDelta,
} from "./state/graph-state.js";

// ===== Checkpointer / Snapshot =====
export type {
  GraphConfig,
  StateSnapshot,
  PendingTask,
  InterruptRecord,
  ResumeResult,
  Checkpointer,
} from "./state/checkpoint.js";
export {
  MemoryCheckpointer,
  createMemoryCheckpointer,
  serializeSnapshot,
  deserializeSnapshot,
  createSnapshot,
} from "./state/checkpoint.js";

// ===== Executor =====
export {
  StateGraphExecutor,
  type StepResult,
  type GraphNode,
} from "./state/executor.js";

// ===== Interrupt / Command =====
export type { InterruptResult, InterruptId } from "./state/interrupt.js";
export {
  Command,
  interrupt,
  isCommand,
  interruptId,
} from "./state/interrupt.js";

// ===== Attachment / Binary Store =====
export type {
  AttachmentKind,
  AttachmentRef,
  BinaryAttachmentStore,
} from "./attachment/attachment-ref.js";
export {
  createAttachmentRef,
  InMemoryBinaryAttachmentStore,
  createInMemoryBinaryAttachmentStore,
} from "./attachment/attachment-ref.js";

// ===== Errors =====
export type { DurableStateDomain, DurableStateCategory } from "./errors.js";
export {
  DurableStateError,
  ChannelNotFoundError,
  CheckpointError,
  GraphInterrupt,
  CommandError,
  AttachmentRefError,
  isDurableStateError,
  hasDurableStateErrorCode,
} from "./errors.js";

// ===== Session Adapter (requires @vinhnt-sdk/session peer dep) =====
export type { SerializedRunState } from "@vinhnt-sdk/session";
export {
  runStateToSnapshot,
  snapshotToRunState,
  snapshotFromDefinition,
  applyDeltaToSnapshot,
  SessionStoreCheckpointer,
  isChannelNotFoundError,
} from "./state/session-adapter.js";
