# @vinhnt-sdk/guard

> Version: 0.4.3 | Status: stable

Circuit breaker, loop detection, tool timeout, monotonic guards, and secret redaction for resilient agent execution.

## Install

```bash
npm install @vinhnt-sdk/guard
# or
pnpm add @vinhnt-sdk/guard
```

## Quick Start

```typescript
import { CircuitBreaker, evaluateGuards } from "@vinhnt-sdk/guard";

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60_000,
  halfOpenMaxAttempts: 3,
});

try {
  const result = await breaker.execute(() => riskyOperation());
} catch (e) {
  // CircuitBreakerOpenError — back off and retry later
}

// Monotonic guards: once denied, cannot be reopened
const decision = await evaluateGuards(
  [
    { name: "safety", check: async () => ({ decision: "allow" }) },
    { name: "rate-limit", check: async () => ({ decision: "deny", reason: "too fast" }) },
  ],
  { toolId: "my-tool" },
  { toolName: "read_file", input: {} },
);
// decision → "deny"
```

## API Reference

Full export list, types, and examples: [docs/api/guard.en.md](../../docs/api/guard.en.md) · [docs/api/guard.vi.md](../../docs/api/guard.vi.md)

### Key exports

| Export | Kind | Description |
|--------|------|-------------|
| `CircuitBreaker` | class | Open after N consecutive failures; half-open recovery |
| `CircuitBreakerOpenError` | class | Retryable error thrown while circuit is open |
| `evaluateGuards` | function | Evaluate guards with monotonic deny-wins semantics |
| `GuardDecision` | type | `allow` \| `deny` \| `ask` (open union) |
| `ToolGuard` | type | Per-tool guard with name + check |
| `LoopDetector` | class | Doom-loop detection for repeated tool calls |
| redaction helpers | function | Secret redaction in logs and LLM output |

## Dependencies

- `@vinhnt-sdk/schema`

## License

MIT
