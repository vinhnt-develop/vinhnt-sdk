# @vinhnt-sdk/guardrails

> Version: 0.4.0 | Status: BETA

Guardrail tripwires for agent inputs/outputs — pattern-based safety checks.

## Install

```bash
# npm
npm install @vinhnt-sdk/guardrails

# pnpm (monorepo)
pnpm add @vinhnt-sdk/guardrails
```

## Quick Start

```typescript
import { runGuardrails, maxLengthGuardrail, blocklistGuardrail } from '@vinhnt-sdk/guardrails';

const guardrails = [
  maxLengthGuardrail(10000),
  blocklistGuardrail([/ignore previous instructions/gi]),
];

const result = await runGuardrails(guardrails, {
  direction: 'input',
  content: 'user input here',
  toolName: 'chat',
});

if (result.decision === 'deny') {
  throw new Error(`Blocked: ${result.reason}`);
}
```

## Exports

### Types

| Type | Description |
|------|-------------|
| `Guardrail` | Guardrail interface |
| `GuardrailContext` | Context passed to guardrails |
| `GuardrailResult` | Result of a guardrail check |
| `GuardrailScope` | When the check runs (`input` / `output` / `both`) |

### Functions

| Function | Description |
|----------|-------------|
| `runGuardrails(guardrails, ctx)` | Run guardrails in priority order with monotonic semantics |
| `maxLengthGuardrail(maxChars)` | Maximum input length guardrail |
| `blocklistGuardrail(patterns)` | Blocklist pattern guardrail |
| `secretDetectionGuardrail(redactor)` | Secret detection guardrail |

## Dependencies

- `@vinhnt-sdk/schema`
- `@vinhnt-sdk/guard`
