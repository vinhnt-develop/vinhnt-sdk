---
title: Design Patterns
description: Patterns used in vinhnt-sdk
lang: en
type: concept
category: Architecture
sidebarPosition: 3
---

# Design Patterns

This document describes the core design patterns used throughout the `vinhnt-sdk` codebase. Each pattern includes a description, usage guidance, code example, and common anti-pattern to avoid.

---

## 1. Capability Seam

**Description:** Decouple service definition from implementation via a Provider/Consumer contract. The definition declares capabilities, the provider implements them, and the consumer depends only on the interface.

**When to use:** When you need pluggable backends (e.g., LLM providers, storage backends, transport layers).

```
Service Definition → Provider → Consumer
```

```ts
// Definition
interface LlmAdapter {
  chat(params: ChatParams): Promise<ChatResult>;
}

// Provider
class OpenAICompatibleProvider implements LlmAdapter {
  async chat(params: ChatParams): Promise<ChatResult> {
    // implementation
  }
}

// Consumer
class AgentKernel {
  constructor(private llm: LlmAdapter) {}
  async run(prompt: string) {
    return this.llm.chat({ messages: [{ role: "user", content: prompt }] });
  }
}
```

**Anti-pattern:** Importing a concrete provider directly in consumer code. Always depend on the interface.

---

## 2. Branded Types

**Description:** Create type-safe IDs using `BrandedId<T>` to prevent mixing different ID types at compile time.

**When to use:** When you have multiple ID-like string types that must not be interchangeable.

```ts
type RunId = BrandedId<"RunId">;
type SessionId = BrandedId<"SessionId">;

function getRun(id: RunId) { /* ... */ }

const runId = "run_abc" as RunId;
const sessionId = "sess_xyz" as SessionId;

getRun(runId);      // OK
getRun(sessionId);  // Compile error — types are distinct
```

**Anti-pattern:** Using plain `string` for IDs. You lose compile-time safety and invites runtime bugs.

---

## 3. Open vs Strict Unions

**Description:** Choose between strict literal unions and open string types depending on whether the domain is closed or extensible.

**When to use — Strict:** Internal state machines where no external extension is needed.

```ts
type CircuitState = "closed" | "open" | "half_open";

function transition(state: CircuitState): CircuitState {
  // exhaustive handling guaranteed
}
```

**When to use — Open:** Plugin-facing APIs where third parties may add custom values.

```ts
type ToolRisk = string;

const builtIn: ToolRisk = "read";
const pluginRisk: ToolRisk = "custom_network_call"; // valid
```

**Anti-pattern:** Using an open union for internal state machines — you lose exhaustive switch checking.

---

## 4. Extensible Metadata

**Description:** Add an optional `metadata` bag (`Record<string, unknown>`) to types that may need additional fields in the future without breaking changes.

**When to use:** On public-facing types like `Run`, `Session`, `ToolDefinition` where plugins or consumers attach extra data.

```ts
interface Run {
  id: RunId;
  status: RunStatus;
  metadata?: Record<string, unknown>;
}

// Consumer attaches custom data
const run = await kernel.startRun({ prompt: "hello" });
await kernel.updateRun(run.id, {
  metadata: { ...run.metadata, myPluginVersion: "1.2.0" },
});
```

**Anti-pattern:** Adding required fields to shared types for every new feature — this breaks existing consumers.

---

## 5. Named Exports Only

**Description:** Barrel files (`index.ts`) use only named exports. No `export *` to keep the public API surface controlled and predictable.

**When to use:** In every barrel file across the SDK.

```ts
// packages/core/src/index.ts
export { AgentKernel } from "./agent-kernel";
export type { AgentKernelConfig } from "./agent-kernel";
export { VntError } from "./errors";
export type { RunId, SessionId } from "./branded-types";
```

**Anti-pattern:** `export * from "./internal"` — makes every internal symbol public and prevents tree-shaking.

---

## 6. Error Hierarchy

**Description:** All SDK errors extend `VntError` with a machine-readable `code` and a `retryable` flag for automatic retry logic.

**When to use:** For every error the SDK can throw. Always extend `VntError`, never throw raw `Error`.

```ts
class VntError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

class RateLimitError extends VntError {
  constructor(retryAfterMs: number) {
    super(`Rate limited, retry after ${retryAfterMs}ms`, "RATE_LIMITED", true);
    this.retryAfterMs = retryAfterMs;
  }
}

class InvalidInputError extends VntError {
  constructor(detail: string) {
    super(`Invalid input: ${detail}`, "INVALID_INPUT", false);
  }
}
```

**Anti-pattern:** Throwing generic `Error` or `TypeError` — consumers cannot programmatically distinguish SDK errors from others.

---

## Summary

| Pattern | Core Idea |
|---|---|
| Capability Seam | Interface → Provider → Consumer |
| Branded Types | `BrandedId<T>` for type-safe IDs |
| Open vs Strict Unions | Closed literals vs open strings |
| Extensible Metadata | `metadata?: Record<string, unknown>` |
| Named Exports Only | No `export *` |
| Error Hierarchy | `VntError` base with `code` + `retryable` |
