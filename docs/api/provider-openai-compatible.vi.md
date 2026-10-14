---
title: "@vinhnt-sdk/provider-openai-compatible"
description: "Nhà cung cấp tương thích OpenAI + preset"
version: "0.4.6"
lang: "vi"
type: "reference"
category: "API Reference"
sidebarLabel: "provider-openai-compatible"
---

# @vinhnt-sdk/provider-openai-compatible

Nhà cung cấp model cho bất kỳ API nào tương thích với định dạng chat completions của OpenAI. Bao gồm preset tích hợp sẵn cho DeepSeek, Anthropic (qua proxy) và Ollama.

## Nhập

```ts
import {
  OpenAICompatibleProvider,
  createDeepSeekProvider,
  createOllamaProvider,
  buildRequest,
  fromOpenAIStreamChunk,
  createSSEStream,
} from "@vinhnt-sdk/provider-openai-compatible";
```

---

## OpenAICompatibleProvider

Nhà cung cấp model triển khai giao diện nhà cung cấp LLM của vinhnt-sdk cho các API tương thích OpenAI.

### Hàm tạo

```ts
new OpenAICompatibleProvider(config: OpenAICompatibleProviderOptions)
```

### Cấu hình

```ts
const provider = new OpenAICompatibleProvider({
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultModel: "deepseek-chat",
  headers: { "X-Custom": "value" },
});
```

### Phương thức

#### `chat(request)`

Gửi yêu cầu chat completion.

```ts
const response = await provider.chat({
  messages: [{ role: "user", content: "Xin chào" }],
  temperature: 0.7,
  maxTokens: 1024,
});
```

#### `chatStream(request)`

Gửi yêu cầu chat completion phát trực tuyến.

```ts
const stream = await provider.chatStream({
  messages: [{ role: "user", content: "Viết một câu chuyện" }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

---

## Trợ giúp Preset

Factory cấu hình sẵn cho các nhà cung cấp tương thích OpenAI phổ biến.

### Các preset có sẵn

| Trợ giúp | URL cơ sở | Ghi chú |
|--------|-----------|---------|
| `createDeepSeekProvider(opts)` | `https://api.deepseek.com/v1` | Model DeepSeek V2/V3 (export hằng `DEEPSEEK_*`) |
| `createAnthropicProvider(opts)` | `https://api.anthropic.com/v1` | Anthropic Claude qua endpoint tương thích OpenAI |
| `createOllamaProvider(opts?)` | `http://localhost:11434/v1` | Instance Ollama cục bộ |
| `createProviderFromPreset(preset, opts?)` | — | Tạo provider từ `ProviderPreset` tùy chỉnh |

### Sử dụng

```ts
import { createDeepSeekProvider, createOllamaProvider } from "@vinhnt-sdk/provider-openai-compatible";

// DeepSeek
const deepseek = createDeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY });

// Ollama (cục bộ, không cần API key)
const ollama = createOllamaProvider({ model: "llama3" });
```

---

## buildRequest

Xây dựng body yêu cầu tương thích OpenAI từ các tùy chọn.

```ts
const body = buildRequest({
  model: "gpt-4",
  messages: [{ role: "user", content: "Xin chào" }],
  temperature: 0.7,
  maxTokens: 1024,
  tools: [...],
  stream: true,
});
```

### Tham số

| Tùy chọn | Kiểu | Mặc định | Mô tả |
|----------|------|----------|-------|
| `model` | `string` | — | Định danh model |
| `messages` | `Message[]` | — | Tin nhắn hội thoại |
| `temperature` | `number` | `0.7` | Nhiệt độ lấy mẫu |
| `maxTokens` | `number` | `4096` | Số token tối đa tạo |
| `tools` | `Tool[]` | `[]` | Công cụ có sẵn cho function calling |
| `stream` | `boolean` | `false` | Bật phát trực tuyến |

---

## fromOpenAIStreamChunk

Chuyển đổi chunk stream OpenAI thành các sự kiện stream có kiểu.

```ts
const rawChunk = { choices: [{ delta: { content: "Xin chào" } }] };
const events = fromOpenAIStreamChunk(rawChunk);
// [{ type: "text", content: "Xin chào" }]
```

### Giá trị trả về

| Trường chunk | Kiểu sự kiện | Mô tả |
|------------|--------------|-------|
| `delta.content` | `text` | Chunk nội dung văn bản |
| `delta.reasoning_content` | `thinking` | Chuỗi suy luận của DeepSeek reasoner |
| `delta.tool_calls` | `tool_call` | Chunk gọi công cụ (`id`, `name`, `args`; delta dùng `__delta`) |
| `finish_reason` | `finish` | Stream hoàn thành |
| `logprobs` | `logprobs` | Logprob token |
| `usage` | `usage` | Sử dụng token (chunk cuối) |

---

## createSSEStream

Trình phân tích Server-Sent Events để xử lý phản hồi HTTP phát trực tuyến. Async generator sinh `OpenAIStreamChunk` đã parse.

```ts
for await (const chunk of createSSEStream(response.body)) {
  console.log(chunk.choices[0]?.delta?.content);
}
```

### Chữ ký

```ts
createSSEStream(body, signal?, state?): AsyncIterable<OpenAIStreamChunk>
```

- `body` — Response body (bytes/async iterable).
- `signal` — `AbortSignal` tùy chọn để dừng phân tích.
- `state` — Trạng thái parse tùy chọn; giúp phân biệt hoàn thành `[DONE]` sạch với stream bị cắt.

---

## Kiểu

### OpenAICompatibleProviderOptions

```ts
interface OpenAICompatibleProviderOptions {
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  providerName?: string;
  headers?: Record<string, string>;
  contextLimit?: number;
  pricing?: ModelPricing;
  capabilities?: Partial<ModelCapabilities>;
  retry?: RetryOptions;
  timeoutMs?: number;
  includeUsage?: boolean;
}
```

### OpenAICompatibleRequestBody

```ts
interface OpenAICompatibleRequestBody {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_call_id?: string;
    tool_calls?: ToolCall[];
  }>;
  temperature?: number;
  max_tokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
}
```

### Sự kiện Stream

Giá trị trả về của `fromOpenAIStreamChunk`:

```ts
type StreamChunkEvent =
  | { type: "text"; content: string }
  | { type: "thinking"; content: string }
  | { type: "tool_call"; id?: string; name?: string; args?: Record<string, unknown> }
  | { type: "finish"; reason: string }
  | { type: "logprobs"; logprobs: unknown }
  | { type: "usage"; inputTokens: number; outputTokens: number; reasoningTokens?: number };
```

---

## Các phụ thuộc

| Gói | Mục đích |
|-----|----------|
| `@vinhnt-sdk/schema` | Định nghĩa kiểu |
| `@vinhnt-sdk/config` | Giao diện cấu hình |
| `@vinhnt-sdk/llm` | Hợp đồng giao diện nhà cung cấp |

---

## Ví dụ: Thiết lập nhà cung cấp đầy đủ

```ts
import { createDeepSeekProvider } from "@vinhnt-sdk/provider-openai-compatible";

const provider = createDeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: "deepseek-chat",
});

const response = await provider.chat({
  messages: [
    { role: "system", content: "Bạn là trợ lý hữu ích." },
    { role: "user", content: "Giải thích ngắn gọn về điện toán lượng tử." },
  ],
  temperature: 0.5,
  maxTokens: 512,
});

console.log(response.choices[0].message.content);
```
