---
title: "@vinhnt-sdk/guardrails"
description: "Guardrail tripwires for agent inputs/outputs"
lang: en
type: "reference"
category: "API Reference"
sidebarLabel: guardrails
version: "0.4.0"
---

# @vinhnt-sdk/guardrails

Guardrail tripwires for agent inputs/outputs — pattern-based safety checks with monotonic semantics.

Inspired by OpenAI Agents SDK guardrail pattern.

## Install

```bash
npm install @vinhnt-sdk/guardrails
```

## Exports

### `runGuardrails(guardrails, ctx)`

Run guardrails in priority order with monotonic semantics. Once a guardrail denies, subsequent guardrails cannot override.

```ts
import { runGuardrails, maxLengthGuardrail, blocklistGuardrail } from "@vinhnt-sdk/guardrails";

const guardrails = [
  maxLengthGuardrail(10000),
  blocklistGuardrail([/ignore previous instructions/gi]),
];

const result = await runGuardrails(guardrails, {
  direction: "input",
  content: "user input here",
  toolName: "chat",
});

if (result.decision === "deny") {
  throw new Error(`Blocked: ${result.reason}`);
}
```

### `maxLengthGuardrail(maxChars, source?)`

Maximum input length guardrail. Denies content exceeding the character limit.

```ts
import { maxLengthGuardrail } from "@vinhnt-sdk/guardrails";

const guard = maxLengthGuardrail(5000, "user-input");
const result = await guard.check({ direction: "input", content: longText });
```

### `blocklistGuardrail(patterns, name?)`

Blocklist pattern guardrail. Denies content matching any of the provided RegExp patterns.

```ts
import { blocklistGuardrail } from "@vinhnt-sdk/guardrails";

const guard = blocklistGuardrail([
  /ignore previous instructions/gi,
  /you are now a villain/gi,
], "safety-blocklist");
```

### `secretDetectionGuardrail(redactor)`

Secret detection guardrail. Redacts detected secrets from output content.

```ts
import { secretDetectionGuardrail } from "@vinhnt-sdk/guardrails";
import { SecretRedactor } from "@vinhnt-sdk/guard";

const redactor = new SecretRedactor();
const guard = secretDetectionGuardrail(redactor);
const result = await guard.check({ direction: "output", content: "my key is sk-..." });
// result.modifiedContent → "my key is [REDACTED:openai-key]"
```

## Types

### `Guardrail`

```ts
interface Guardrail {
  readonly name: string;
  readonly scope: GuardrailScope;
  readonly priority: GuardrailPriority;
  check: (ctx: GuardrailContext) => Promise<GuardrailResult>;
}
```

### `GuardrailScope`

```ts
type GuardrailScope = "input" | "output" | "both";
```

### `GuardrailContext`

```ts
interface GuardrailContext {
  readonly direction: "input" | "output";
  readonly toolName?: string;
  readonly content: unknown;
  readonly metadata?: Record<string, unknown>;
}
```

### `GuardrailResult`

```ts
interface GuardrailResult {
  readonly passed: boolean;
  readonly decision: GuardDecision;
  readonly reason?: string;
  readonly modifiedContent?: unknown;
}
```

## Dependencies

- `@vinhnt-sdk/schema`
- `@vinhnt-sdk/guard`
