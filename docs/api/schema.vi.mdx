---
title: "@vinhnt-sdk/schema"
description: "Các kiểu cơ bản, hợp đồng, ID được đóng gói"
lang: "vi"
version: "0.1.3"
type: "reference"
category: "API Reference"
sidebarLabel: "schema"
---

## Cài đặt

```bash
npm install @vinhnt-sdk/schema
```

## Xuất (Exports)

### Kiểu ID được đóng gói (Branded IDs)

```typescript
type RunId = string & { readonly __brand: "RunId" };
type SessionId = string & { readonly __brand: "SessionId" };
type AgentId = string & { readonly __brand: "AgentId" };
type ToolId = string & { readonly __brand: "ToolId" };
```

| Hàm kiểm tra | Mô tả |
|---------------|-------|
| `isRunId(value)` | Trả về `true` nếu giá trị là `RunId` hợp lệ |
| `assertRunId(value)` | Ném `VntError` nếu giá trị không phải `RunId` hợp lệ |
| `isSessionId(value)` | Trả về `true` nếu giá trị là `SessionId` hợp lệ |
| `assertSessionId(value)` | Ném `VntError` nếu giá trị không phải `SessionId` hợp lệ |
| `isAgentId(value)` | Trả về `true` nếu giá trị là `AgentId` hợp lệ |
| `assertAgentId(value)` | Ném `VntError` nếu giá trị không phải `AgentId` hợp lệ |
| `isToolId(value)` | Trả về `true` nếu giá trị là `ToolId` hợp lệ |
| `assertToolId(value)` | Ném `VntError` nếu giá trị không phải `ToolId` hợp lệ |

### Các lớp lỗi

```typescript
class VntError extends Error {
  code: string;
  cause?: unknown;
}

class ToolNotFoundError extends VntError { code: "TOOL_NOT_FOUND"; }
class ModelNotFoundError extends VntError { code: "MODEL_NOT_FOUND"; }
class ConfigError extends VntError { code: "CONFIG_ERROR"; }
class AuthError extends VntError { code: "AUTH_ERROR"; }
class RateLimitError extends VntError { code: "RATE_LIMIT"; retryAfterMs?: number; }
class TimeoutError extends VntError { code: "TIMEOUT"; }
```

### Kiểu Model

```typescript
type ModelProvider = "openai" | "anthropic" | "google" | "local";

interface ModelCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  imageInput: boolean;
  thinking: boolean;
  structuredOutput: boolean;
}

interface ModelRequest {
  model: string;
  provider: ModelProvider;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  tools?: ToolSchema[];
  signal?: AbortSignal;
}

interface ModelResponse {
  id: string;
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  model: string;
  finishReason: "stop" | "tool_calls" | "length" | "error";
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
```

### Kiểu Agent

```typescript
interface AgentConfig {
  id: AgentId;
  name: string;
  model: string;
  provider: ModelProvider;
  systemPrompt: string;
  tools: ToolId[];
  maxTurns?: number;
  temperature?: number;
}

interface AgentProfile {
  id: AgentId;
  name: string;
  description: string;
  capabilities: ModelCapabilities;
  createdAt: Date;
}
```

### Kiểu Session

```typescript
interface Session {
  id: SessionId;
  agentId: AgentId;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  name?: string;
}

interface SessionStore {
  get(id: SessionId): Promise<Session | null>;
  save(session: Session): Promise<void>;
  delete(id: SessionId): Promise<void>;
  list(agentId?: AgentId): Promise<Session[]>;
}

interface RunEventStore {
  append(event: RunEvent): Promise<void>;
  list(runId: RunId): Promise<RunEvent[]>;
}
```

### Sự kiện Run

```typescript
type RunEvent =
  | { type: "run.start"; runId: RunId; sessionId: SessionId; timestamp: Date }
  | { type: "run.end"; runId: RunId; durationMs: number; timestamp: Date }
  | { type: "message.created"; runId: RunId; message: Message; timestamp: Date }
  | { type: "tool.call"; runId: RunId; toolId: ToolId; input: unknown; timestamp: Date }
  | { type: "tool.result"; runId: RunId; toolId: ToolId; output: unknown; timestamp: Date }
  | { type: "error"; runId: RunId; error: VntError; timestamp: Date };
```

### Schema công cụ

```typescript
const ToolInputSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.unknown()),
});

type ToolSchema = z.infer<typeof ToolInputSchema>;

const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.string(),
});

type ToolCall = z.infer<typeof ToolCallSchema>;
```

### Tiện ích

```typescript
function wildcardMatch(pattern: string, value: string): boolean;
function ok<T>(value: T): { ok: true; value: T };
function fail<E>(error: E): { ok: false; error: E };
```

## Ví dụ sử dụng

```typescript
import {
  RunId, isRunId, assertRunId,
  VntError, ToolNotFoundError,
  ok, fail, wildcardMatch,
} from "@vinhnt-sdk/schema";

// Tạo ID được đóng gói
const runId = "run_abc123" as RunId;
assertRunId(runId); // hợp lệ

// Xử lý lỗi với ok/fail
function divide(a: number, b: number) {
  if (b === 0) return fail(new VntError("Chia cho 0"));
  return ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  console.log(result.value); // 5
}
```

## Xử lý lỗi

Tất cả lỗi tùy chỉnh đều kế thừa từ `VntError`. Bắt lỗi bằng cách:

```typescript
try {
  assertRunId("không hợp lệ");
} catch (e) {
  if (e instanceof VntError) {
    console.error(e.code, e.message);
  }
}
```

## Phụ thuộc

- `zod` — xác thực schema và suy luận kiểu
