---
title: "@vinhnt-sdk/provider-openai-compatible"
description: "Nhà cung cấp tương thích OpenAI + preset"
version: "0.1.3"
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
  PRESETS,
  buildRequest,
  convertStreamChunk,
  SSE,
} from "@vinhnt-sdk/provider-openai-compatible";
```

---

## OpenAICompatibleProvider

Nhà cung cấp model triển khai giao diện nhà cung cấp LLM của vinhnt-sdk cho các API tương thích OpenAI.

### Hàm tạo

```ts
new OpenAICompatibleProvider(config: OpenAICompatibleConfig)
```

### Cấu hình

```ts
const provider = new OpenAICompatibleProvider({
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: "deepseek-chat",
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

## PRESETS

Cấu hình sẵn cho các nhà cung cấp tương thích OpenAI phổ biến.

### Các preset có sẵn

| Preset | URL cơ sở | Ghi chú |
|--------|-----------|---------|
| `deepseek` | `https://api.deepseek.com/v1` | Model DeepSeek V2/V3 |
| `anthropic` | Cấu hình qua proxy | Anthropic Claude qua proxy tương thích OpenAI |
| `ollama` | `http://localhost:11434/v1` | Instance Ollama cục bộ |

### Sử dụng

```ts
import { OpenAICompatibleProvider, PRESETS } from "@vinhnt-sdk/provider-openai-compatible";

// DeepSeek
const deepseek = new OpenAICompatibleProvider({
  ...PRESETS.deepseek,
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Ollama (cục bộ, không cần API key)
const ollama = new OpenAICompatibleProvider({
  ...PRESETS.ollama,
  model: "llama3",
});
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

## convertStreamChunk

Chuyển đổi chunk SSE thô từ stream completions của OpenAI thành đối tượng `StreamChunkEvent` có kiểu.

```ts
const rawChunk = { choices: [{ delta: { content: "Xin chào" } }] };
const event = convertStreamChunk(rawChunk);
// { type: "content", content: "Xin chào" }
```

### Giá trị trả về

| Kiểu chunk | Kiểu sự kiện | Mô tả |
|------------|--------------|-------|
| `delta.content` | `content` | Chunk nội dung văn bản |
| `delta.tool_calls` | `tool_call` | Chunk gọi công cụ |
| `[DONE]` | `done` | Stream hoàn thành |
| Error | `error` | Lỗi stream |

---

## SSE`

Trình phân tích Server-Sent Events để xử lý phản hồi HTTP phát trực tuyến.

```ts
const sse = new SSE(response.body);

for await (const event of sse) {
  if (event.data === "[DONE]") break;
  const chunk = JSON.parse(event.data);
  console.log(chunk.choices[0]?.delta?.content);
}
```

### Phương thức

#### `static parse(text)`

Phân tích chuỗi văn bản SSE thô thành các sự kiện.

```ts
const events = SSE.parse("data: {\"hello\":\"world\"}\n\n");
```

---

## Kiểu

### OpenAICompatibleConfig

```ts
interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey?: string;
  model?: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
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

### StreamChunkEvent

```ts
type StreamChunkEvent =
  | { type: "content"; content: string }
  | { type: "tool_call"; toolCall: ToolCall }
  | { type: "done"; usage: TokenUsage }
  | { type: "error"; error: Error };
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
import {
  OpenAICompatibleProvider,
  PRESETS,
} from "@vinhnt-sdk/provider-openai-compatible";

const provider = new OpenAICompatibleProvider({
  ...PRESETS.deepseek,
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
