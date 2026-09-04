# vinhnt-sdk Improvement Issues — From deepseek-harness Analysis

> Generated: 2026-09-04
> Source: Deep comparison with `@deepseek-ai/dsh` (deepseek-harness)

## Context

deepseek-harness is a production-grade agent framework with 55 packages, event-sourced sessions, waterfall plugin dispatch, and structured error handling. vinhnt-sdk is a lightweight alternative. This document identifies concrete improvements for vinhnt-sdk based on patterns observed in deepseek-harness.

---

## Tier 1 — Architectural (High Impact)

### Issue 1: Event-Sourced Session Log

**Problem:** `SessionRuntimeState` is mutable (messages array). No append-only event log. Cannot replay, compact, or audit conversations.

**deepseek-harness pattern:** `Session` class has `private log: SessionEvent[]`. Events are deep-frozen at acceptance. `SurfaceManager` derives model-visible history from events.

**Suggestion:**
- Add `SessionEvent` discriminated union to `@vinhnt-sdk/schema`
- Add `SessionEventLog` class to `@vinhnt-sdk/session` with append-only semantics
- Add `SurfaceManager` that derives `ChatMessage[]` from events
- Stamp `SESSION_FORMAT_VERSION` into session headers

**Files to modify:**
- `packages/schema/src/types/session-store.ts`
- `packages/session/src/session-state.ts`
- `packages/session/src/in-memory-session-state.ts`

---

### Issue 2: SdkError Base Class

**Problem:** No base error class with stable machine-routable codes. `classifyError()` uses `msg.includes()` string matching.

**deepseek-harness pattern:** `HarnessError extends Error` with `readonly code: string`. `errorChain()` renders nested causes. `isContextWindowExceededError()` uses regex.

**Suggestion:**
- Create `SdkError extends Error` in `@vinhnt-sdk/schema` with `readonly code: string`
- Port `errorChain()` utility
- Add `isContextWindowExceededError()`, `isQuotaExceededError()` classifiers
- Make all SDK errors extend `SdkError`: `ToolNotFoundError`, `ToolOutputError`, `LlmFailure`

**Files to create:**
- `packages/schema/src/errors/sdk-error.ts`
- `packages/schema/src/errors/error-chain.ts`
- `packages/schema/src/errors/classifiers.ts`

---

### Issue 3: Agent Phase State Machine

**Problem:** `RunLoop` is linear. No phase tracking, no inbox model, no per-phase abort.

**deepseek-harness pattern:** `ReactLoopAgent` has phases: `idle`, `maintenance`, `running`. Inbox has `next-turn` and `next-step` queues. Each phase owns its own `AbortController`.

**Suggestion:**
- Add `AgentPhase` enum: `idle`, `running`, `maintenance`
- Add `Inbox` class with `next-turn` and `next-step` queues
- Create per-phase `AbortController` management
- Add `whenIdle()` promise-based idle detection

**Files to modify:**
- `packages/core/src/kernel/run-loop.ts`
- `packages/core/src/kernel/types.ts`

---

### Issue 4: Waterfall Event Dispatch

**Problem:** `EventBus` only has simple pub/sub. No waterfall (chained) or parallel dispatch.

**deepseek-harness pattern:** Cordis provides `waterfall` (ordered chain with `next()`), `parallel` (concurrent all-settled), and `emit` (fire-and-forget) dispatch modes.

**Suggestion:**
- Add `EventBus.waterfall(name, data, signal?)` method
- Add `EventBus.parallel(name, data, signal?)` method
- Tool pipeline uses waterfall for `pre-execute`, `execute`, `post-execute`
- Each listener can call `next(data)` to pass to next listener or return modified data

**Files to modify:**
- `packages/event/src/types.ts`
- `packages/event/src/in-memory-bus.ts`

---

## Tier 2 — Functional (Medium Impact)

### Issue 5: Tool Output Schema Validation

**Problem:** Tool output is returned as raw `ToolExecutionResult`. No validation against declared schema.

**deepseek-harness pattern:** `ToolOutputDefinition` with JSON Schema + `render()` projection. Invalid output throws `ToolOutputError`.

**Suggestion:**
- Add `output?: { schema: JSONSchema, render: (result: unknown) => string }` to `ToolDefinition`
- Validate output against schema in `ToolRuntime.execute()`
- Throw `ToolOutputError` (extends `SdkError`) on validation failure

---

### Issue 6: Turn/Step Boundary Events

**Problem:** `RunEvent` captures `run.started`/`run.completed` but not per-turn granularity.

**deepseek-harness pattern:** Session log has `turn/start`, `turn/end`, `step/start`, `step/end` events.

**Suggestion:**
- Add event types to `@vinhnt-sdk/schema`: `TurnStarted`, `TurnCompleted`, `StepStarted`, `StepCompleted`
- Append these events in `RunLoop` at each boundary
- Enable replay/resume from any boundary point

---

### Issue 7: Tool Concurrency Declaration

**Problem:** `maxConcurrentToolCalls` exists but tools cannot declare their own safety.

**deepseek-harness pattern:** `isConcurrencySafe?(args): boolean` on tool definition. Scheduler uses this for parallel vs exclusive dispatch.

**Suggestion:**
- Add `isConcurrencySafe?: (args: Record<string, unknown>) => boolean` to `ToolDefinition`
- `StepExecutor` checks this before parallel dispatch
- Default: `false` (conservative)

---

### Issue 8: Presentation Hooks on Tools

**Problem:** No way to render tool calls/results for UI without executing them.

**deepseek-harness pattern:** `presentCall(args)` and `presentResult(args, result)` pure functions on tool definitions.

**Suggestion:**
- Add `presentCall?: (args: Record<string, unknown>) => string` to `ToolDefinition`
- Add `presentResult?: (args: Record<string, unknown>, result: unknown) => string` to `ToolDefinition`
- Use during live streaming AND session replay

---

### Issue 9: Scope-Filtered Event Dispatch

**Problem:** All listeners see all events. No isolation between concurrent agents.

**deepseek-harness pattern:** Cordis provides scope-filtered dispatch. Agent-scoped listeners see only their agent's events.

**Suggestion:**
- Add `scope?: string` parameter to `EventBus.subscribe()`
- Events carry `scope` metadata
- Subscribers only receive events matching their scope
- Enable multi-agent isolation

---

### Issue 10: Discriminated Union Events

**Problem:** `RunEvent { type: string, data: Record<string, unknown> }` — no type narrowing.

**deepseek-harness pattern:** `SessionEvent<T>` is a discriminated union. `switch (event.type)` narrows `event.data`.

**Suggestion:**
- Replace `RunEvent` with `RunEventMap` discriminated union
- Each event type has a specific data schema
- `switch (event.type)` gives full type safety

---

## Tier 3 — Quality (Lower Impact)

### Issue 11: Branded Types for IDs

**Problem:** `sessionId: string`, `runId: string` — no type safety.

**Suggestion:** Add branded types: `SessionId = Branded<'SessionId'>`, `RunId = Branded<'RunId'>`, `ToolCallId = Branded<'ToolCallId'>`.

---

### Issue 12: Deep Freezing of Events

**Problem:** All state is mutable after creation.

**Suggestion:** Add `deepFreeze()` utility. Apply to events and session headers after acceptance.

---

### Issue 13: JSON Serialization Validation

**Problem:** Events stored as-is. May contain `undefined`, `Function`, `Map`, `Set`.

**Suggestion:** Add `isJsonValue()` check before persisting events.

---

### Issue 14: Maintenance Phase in Agent Loop

**Problem:** No mechanism for background work between steps.

**Suggestion:** Add `runMaintenance(job)` method that runs a callback between turns with its own abort signal.

---

### Issue 15: concludeTurn() / deferContext() on Tool Context

**Problem:** Tools cannot signal turn termination or defer context injection.

**Suggestion:** Add `concludeTurn()` and `deferContext()` methods to tool execution context.

---

## Implementation Order

| Phase | Issues | Effort |
|-------|--------|--------|
| Phase A | #2 (SdkError), #11 (Branded types), #12 (Deep freeze) | 1-2 days |
| Phase B | #6 (Boundary events), #10 (Discriminated unions) | 2-3 days |
| Phase C | #1 (Event-sourced session), #5 (Output validation) | 3-5 days |
| Phase D | #3 (Phase state machine), #4 (Waterfall dispatch) | 5-7 days |
| Phase E | #7-#9, #13-#15 | 3-5 days |

**Total estimated effort:** 14-22 days

---

## Files to Reference

| File | What to learn |
|------|--------------|
| `deepseek-harness/packages/core/session/src/index.ts` | Event-sourced session, surface management |
| `deepseek-harness/packages/llm/llm/src/error.ts` | Error hierarchy, errorChain() |
| `deepseek-harness/packages/core/agent-loop/src/agent.ts` | Phase state machine, inbox model |
| `deepseek-harness/packages/core/tools/src/index.ts` | Tool pipeline, waterfall dispatch |
| `deepseek-harness/packages/core/session/src/types.ts` | Session event vocabulary |
