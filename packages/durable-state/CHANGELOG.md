# @vinhnt-sdk/durable-state

## 0.23.1

### Patch Changes

- @vinhnt-sdk/schema@0.23.1
  - @vinhnt-sdk/session@0.23.1

## 0.23.0

### Minor Changes

- Add `@vinhnt-sdk/durable-state` — durable state management for agent orchestration.
  
  New package (beta). Provides StateChannel + Reducer, StateGraph builder, Checkpointer with StateSnapshot, interrupt()/Command(resume) durable HITL primitive, StateGraphExecutor runtime, AttachmentRef + BinaryAttachmentStore (binary refs outside JSON checkpoints), and session adapter (SerializedRunState <-> StateSnapshot) for integrating with @vinhnt-sdk/session.
  
  Not merged into @vinhnt-sdk/workflow — kept separate to avoid forcing the heavy graph/checkpoint dependency on all consumers. Neutral naming (no LangGraph brand coupling).
  
  Install: `npm install @vinhnt-sdk/durable-state` or `pnpm add @vinhnt-sdk/durable-state`

### Patch Changes

- @vinhnt-sdk/schema@0.23.0
  - @vinhnt-sdk/session@0.23.0
