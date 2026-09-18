---
title: "@vinhnt-sdk/guardrails"
description: "Guardrail tripwires cho input/output agent"
lang: vi
type: "reference"
category: "API Reference"
sidebarLabel: guardrails
version: "0.4.0"
---

# @vinhnt-sdk/guardrails

Guardrail tripwires cho input/output agent — kiểm tra an toàn dựa trên mẫu với ngữ nghĩa monotonic.

Được lấy cảm hứng từ guardrail pattern của OpenAI Agents SDK.

## Cài đặt

```bash
npm install @vinhnt-sdk/guardrails
```

## Xuất (Exports)

### `runGuardrails(guardrails, ctx)`

Chạy guardrails theo thứ tự ưu tiên với ngữ nghĩa monotonic. Khi một guardrail deny, các guardrail sau không thể override.

```ts
import { runGuardrails, maxLengthGuardrail, blocklistGuardrail } from "@vinhnt-sdk/guardrails";

const guardrails = [
  maxLengthGuardrail(10000),
  blocklistGuardrail([/ignore previous instructions/gi]),
];

const result = await runGuardrails(guardrails, {
  direction: "input",
  content: "nội dung đầu vào",
  toolName: "chat",
});

if (result.decision === "deny") {
  throw new Error(`Bị chặn: ${result.reason}`);
}
```

### `maxLengthGuardrail(maxChars, source?)`

Guardrail giới hạn độ dài đầu vào. Deny nội dung vượt quá giới hạn ký tự.

### `blocklistGuardrail(patterns, name?)`

Guardrail danh sách chặn. Deny nội dung khớp với bất kỳ mẫu RegExp nào.

### `secretDetectionGuardrail(redactor)`

Guardrail phát hiện bí mật. Redact các bí mật được phát hiện từ nội dung đầu ra.

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
