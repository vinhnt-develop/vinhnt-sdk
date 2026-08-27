---
title: "@vinhnt-sdk/llm"
description: "Trừu tượng hóa adapter LLM, registry, thử lại"
lang: "vi"
version: "0.1.3"
type: "reference"
category: "API Reference"
sidebarLabel: "llm"
---

## Cài đặt

```bash
npm install @vinhnt-sdk/llm
```

## Xuất (Exports)

### Lớp

#### `LlmAdapter` (trừu tượng)

Lớp cơ sở trừu tượng cho các adapter nhà cung cấp LLM.

```typescript
abstract class LlmAdapter {
  abstract providerInfo(): ProviderInfo;
  abstract stream(request: ModelRequest): AsyncIterable<StreamChunk>;
}
```

| Phương thức | Trả về | Mô tả |
|-------------|--------|-------|
| `providerInfo()` | `ProviderInfo` | Trả về metadata về nhà cung cấp |
| `stream(request)` | `AsyncIterable<StreamChunk>` | Phát trực tiếp các phần phản hồi |

#### `LlmRegistry`

Registry quản lý các instance adapter LLM.

```typescript
class LlmRegistry {
  register(provider: ModelProvider, adapter: LlmAdapter): void;
  get(provider: ModelProvider): LlmAdapter;
  has(provider: ModelProvider): boolean;
  list(): ModelProvider[];
}
```

| Phương thức | Ném lỗi | Mô tả |
|-------------|---------|-------|
| `register(provider, adapter)` | `ConfigError` | Đăng ký adapter cho nhà cung cấp |
| `get(provider)` | `ModelNotFoundError` | Lấy adapter theo nhà cung cấp |
| `has(provider)` | — | Kiểm tra nhà cung cấp đã được đăng ký |
| `list()` | — | Trả về tất cả nhà cung cấp đã đăng ký |

#### `TokenMeter`

Tiện ích ước tính số token để định cỡ yêu cầu.

```typescript
class TokenMeter {
  estimateTokens(text: string): number;
  estimateMessages(messages: Message[]): number;
  fitsContext(text: string, maxTokens: number): boolean;
}
```

| Phương thức | Trả về | Mô tả |
|-------------|--------|-------|
| `estimateTokens(text)` | `number` | ước tính số token cho chuỗi |
| `estimateMessages(messages)` | `number` | ước tính tổng token cho tin nhắn |
| `fitsContext(text, maxTokens)` | `boolean` | Kiểm tra văn bản có vừa giới hạn token |

### Hàm

#### `shouldRetry(error: Error, attempt: number, policy: RetryPolicy): boolean`

Xác định có nên thử lại yêu cầu dựa trên lỗi và số lần thử.

```typescript
const retry = shouldRetry(new RateLimitError("Bị giới hạn tốc độ"), 1, {
  maxAttempts: 3,
  retryOn: ["RATE_LIMIT", "TIMEOUT"],
});
// true
```

#### `calculateDelay(attempt: number, policy: RetryPolicy): number`

Tính toán độ trễ tính bằng mili giây sử dụng lũy thừa cơ sở với nhiễu.

```typescript
const delay = calculateDelay(2, {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: true,
});
// ~4000ms (có nhiễu)
```

### Kiểu

```typescript
interface GenerateOptions {
  model: string;
  provider: ModelProvider;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  tools?: ToolSchema[];
  signal?: AbortSignal;
  onChunk?: (chunk: StreamChunk) => void;
}

interface StreamChunk {
  type: "text" | "tool_call" | "done" | "error";
  content?: string;
  toolCall?: ToolCall;
  usage?: TokenUsage;
  finishReason?: string;
}

interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  retryOn?: string[];
}

interface ProviderInfo {
  provider: ModelProvider;
  name: string;
  version: string;
  capabilities: ModelCapabilities;
  maxContextLength: number;
  supportedModels: string[];
}
```

## Ví dụ sử dụng

```typescript
import {
  LlmAdapter, LlmRegistry, TokenMeter,
  shouldRetry, calculateDelay,
} from "@vinhnt-sdk/llm";

// Triển khai adapter tùy chỉnh
class OpenAIAdapter extends LlmAdapter {
  providerInfo(): ProviderInfo {
    return {
      provider: "openai",
      name: "OpenAI",
      version: "1.0.0",
      capabilities: {
        streaming: true,
        toolCalling: true,
        imageInput: false,
        thinking: false,
        structuredOutput: true,
      },
      maxContextLength: 128000,
      supportedModels: ["gpt-4o", "gpt-4o-mini"],
    };
  }

  async *stream(request: ModelRequest): AsyncIterable<StreamChunk> {
    // Triển khai ở đây
    yield { type: "done", finishReason: "stop" };
  }
}

// Đăng ký và sử dụng
const registry = new LlmRegistry();
registry.register("openai", new OpenAIAdapter());

const adapter = registry.get("openai");
const meter = new TokenMeter();

if (meter.fitsContext("Xin chào thế giới", 4096)) {
  for await (const chunk of adapter.stream({
    model: "gpt-4o",
    provider: "openai",
    messages: [{ role: "user", content: "Xin chào" }],
  })) {
    process.stdout.write(chunk.content ?? "");
  }
}
```

## Xử lý lỗi

```typescript
import { RateLimitError, TimeoutError, ModelNotFoundError } from "@vinhnt-sdk/schema";

async function callWithRetry(request: GenerateOptions, policy: RetryPolicy) {
  let attempt = 0;
  while (attempt < policy.maxAttempts) {
    try {
      return await adapter.stream(request);
    } catch (e) {
      attempt++;
      if (!shouldRetry(e as Error, attempt, policy)) throw e;
      const delay = calculateDelay(attempt, policy);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new TimeoutError("Vượt quá số lần thử lại tối đa");
}
```

## Phụ thuộc

- `@vinhnt-sdk/schema` — kiểu model, lớp lỗi, ID được đóng gói
