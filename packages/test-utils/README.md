# @vinhnt-sdk/test-utils

> Version: 0.6.1 | Status: STABLE

Shared test utilities for vinhnt-sdk packages — mock factories, assertion helpers, and test patterns.

## Install

`ash
# npm
npm install @vinhnt-sdk/test-utils

# pnpm (monorepo)
pnpm add -D @vinhnt-sdk/test-utils
`

## Features

- **createMockUsage** — Mock RunUsage with token/cost defaults
- **createMockMessage** — Mock ChatMessage for any role
- **createMockAbortController** — Mock AbortController for cancellation tests
- **createSequence** — Generate sequential values for deterministic tests
- **assertThrows** — Assert async functions throw with expected messages
- **wait** — Async delay for timing-sensitive tests

## Quick Start

`	ypescript
import {
  createMockUsage,
  createMockMessage,
  createMockAbortController,
  createSequence,
  assertThrows,
  wait,
} from "@vinhnt-sdk/test-utils";

// Mock usage metrics
const usage = createMockUsage({ inputTokens: 200, outputTokens: 100 });
// => { inputTokens: 200, outputTokens: 100, totalTokens: 300 }

// Mock messages
const userMsg = createMockMessage("user", "Hello world");
const assistantMsg = createMockMessage("assistant", [
  { type: "text", text: "Hi there!" },
]);

// Deterministic sequences
const model = createSequence(["gpt-4o", "gpt-4o-mini", "claude-sonnet-4-20250514"]);
model(); // "gpt-4o"
model(); // "gpt-4o-mini"
model(); // "claude-sonnet-4-20250514"
model(); // "gpt-4o" (wraps around)
`

## API Reference

### Mock Factories

| Export | Description |
|--------|-------------|
| createMockUsage(overrides?) | Create mock RunUsage with defaults |
| createMockMessage(role, content, extra?) | Create mock ChatMessage |
| createMockAbortController() | Create mock AbortController |

### Assertion Helpers

| Export | Description |
|--------|-------------|
| ssertThrows(fn, expectedMessage?) | Assert async function throws |
| createSequence(values) | Create sequential value generator |

### Utilities

| Export | Description |
|--------|-------------|
| wait(ms) | Async delay |

## Usage Examples

### Testing Agent Run Results

`	ypescript
import { createMockUsage, assertThrows } from "@vinhnt-sdk/test-utils";

// Test usage aggregation
const usage1 = createMockUsage({ inputTokens: 100, outputTokens: 50 });
const usage2 = createMockUsage({ inputTokens: 200, outputTokens: 100 });

expect(usage1.inputTokens).toBe(100);
expect(usage2.totalTokens).toBe(300);
`

### Testing Error Handling

`	ypescript
import { assertThrows } from "@vinhnt-sdk/test-utils";

await assertThrows(
  () => kernel.run("invalid prompt", ctx),
  "Agent not found",
);
`

### Testing Async Operations

`	ypescript
import { wait, createMockAbortController } from "@vinhnt-sdk/test-utils";

// Test timeout behavior
const controller = createMockAbortController();
setTimeout(() => controller.abort(), 100);

// Test with delay
await wait(50);
expect(someState).toBe("intermediate");

await wait(100);
expect(someState).toBe("final");
`

## License

MIT
