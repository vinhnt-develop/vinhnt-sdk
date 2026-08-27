---
title: "@vinhnt-sdk/guard"
description: "Circuit breaker, loop detection, tool timeout"
lang: en
type: "reference"
category: "API Reference"
sidebarLabel: guard
version: "0.1.3"
---

# @vinhnt-sdk/guard

Circuit breaker, loop detection, and tool timeout guards for resilient agent execution.

## Exports

### `CircuitBreaker`

Track consecutive failures and open the circuit after a threshold. Prevents cascading failures in repeated tool calls.

```ts
import { CircuitBreaker } from "@vinhnt-sdk/guard";

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000,
  halfOpenMaxAttempts: 3,
});

try {
  const result = await breaker.execute(async () => {
    return await riskyOperation();
  });
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    console.log("Circuit is open, retry later");
  }
}
```

**Methods:**

- `execute(fn)` — Execute function through circuit breaker. Throws `CircuitBreakerOpenError` when circuit is open.
- `getState()` — Return current circuit state.
- `reset()` — Manually reset circuit to closed state.
- `getFailureCount()` — Return current consecutive failure count.

### `CircuitBreakerOpenError`

Error thrown when circuit breaker is open. This error is retryable — the caller should back off and retry later.

```ts
import { CircuitBreakerOpenError } from "@vinhnt-sdk/guard";

try {
  await breaker.execute(fn);
} catch (e) {
  if (e instanceof CircuitBreakerOpenError) {
    // Retryable — wait and try again
    console.log(`Circuit opens until ${e.retryAfter}`);
  }
}
```

**Properties:**

- `retryAfter` — Timestamp (ms) when circuit may transition to half-open

### `LoopDetector`

Detect repeated tool calls that may indicate agent loops. Tracks call patterns and flags suspicious repetition.

```ts
import { LoopDetector } from "@vinhnt-sdk/guard";

const detector = new LoopDetector({
  maxRepetitions: 3,
  windowMs: 60000,
  patternSize: 5,
});

detector.recordCall({ tool: "read_file", params: { path: "/foo" } });
detector.recordCall({ tool: "read_file", params: { path: "/foo" } });
detector.recordCall({ tool: "read_file", params: { path: "/foo" } });

if (detector.isLoopDetected()) {
  console.log("Agent loop detected!");
}
```

**Methods:**

- `recordCall(call)` — Record a tool call with metadata
- `isLoopDetected()` — Check if a loop pattern is detected
- `getLoopInfo()` — Return details about detected loop
- `reset()` — Clear all recorded calls

### `ToolTimeout`

Wrap tool execution with a timeout. Automatically aborts if execution exceeds the limit.

```ts
import { ToolTimeout } from "@vinhnt-sdk/guard";

const timeout = new ToolTimeout(10000); // 10 seconds

const result = await timeout.execute(async (signal) => {
  return await longRunningTool(params, { abortSignal: signal });
});
```

**Methods:**

- `execute(fn)` — Execute function with timeout. Throws `ToolTimeoutError` on timeout.
- `getRemainingTime()` — Return remaining time in ms

### `ToolTimeoutError`

Error thrown when tool execution exceeds timeout. This error is non-retryable — retrying immediately will likely timeout again.

```ts
import { ToolTimeoutError } from "@vinhnt-sdk/guard";

try {
  await timeout.execute(fn);
} catch (e) {
  if (e instanceof ToolTimeoutError) {
    // Non-retryable
    console.log(`Timed out after ${e.timeoutMs}ms`);
  }
}
```

**Properties:**

- `timeoutMs` — The timeout that was exceeded

## Types

### `CircuitState`

```ts
type CircuitState = "closed" | "open" | "half_open";
```

- `closed` — Normal operation, calls pass through
- `open` — Circuit tripped, calls are rejected
- `half_open` — Recovery test, limited calls allowed

### `CircuitBreakerConfig`

```ts
interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxAttempts?: number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}
```

### `LoopDetectorConfig`

```ts
interface LoopDetectorConfig {
  maxRepetitions: number;
  windowMs: number;
  patternSize?: number;
  onLoopDetected?: (info: LoopInfo) => void;
}
```

## Usage Patterns

### Combining Guards

```ts
import { CircuitBreaker, LoopDetector, ToolTimeout } from "@vinhnt-sdk/guard";

const breaker = new CircuitBreaker({ failureThreshold: 3, recoveryTimeout: 30000 });
const detector = new LoopDetector({ maxRepetitions: 5, windowMs: 60000 });
const timeout = new ToolTimeout(15000);

async function safeToolCall(toolFn) {
  if (detector.isLoopDetected()) throw new Error("Loop detected");
  return breaker.execute(() => timeout.execute(toolFn));
}
```

## Dependencies

- `@vinhnt-sdk/schema` — JSON Schema validation and type definitions
