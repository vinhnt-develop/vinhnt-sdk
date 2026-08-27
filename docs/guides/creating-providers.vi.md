---
title: "Tạo Nhà Cung Cấp"
description: "Triển khai nhà cung cấp mô hình tùy chỉnh"
lang: "vi"
type: "guide"
category: "Guides"
sidebarPosition: 2
---

# Tạo Nhà Cung Cấp

Nhà cung cấp là cầu nối giữa agent của bạn và các mô hình ngôn ngữ. Hướng dẫn này chỉ cho bạn cách triển khai nhà cung cấp mô hình tùy chỉnh sử dụng `@vinhnt-sdk/core`.

## Giao Diện ModelProvider

Mỗi nhà cung cấp phải triển khai giao diện `ModelProvider`:

```typescript
import { ModelProvider } from "@vinhnt-sdk/core";

const nhaCungCapCuaToi: ModelProvider = {
  id: "nha-cung-cap-cua-toi",
  name: "Nhà Cung Cấp Tùy Chỉnh",

  async generate(request) {
    // Gửi yêu cầu đến mô hình, nhận phản hồi
  },

  async *stream(request) {
    // Phát token khi chúng đến
  },
};
```

### Các Phương Thức Giao Diện

| Phương Thức | Mô Tả |
|-------------|-------|
| `generate(request)` | Gửi prompt và nhận phản hồi hoàn chỉnh |
| `stream(request)` | Gửi prompt và phát token khi chúng đến |
| `listModels()` | Trả về các mô hình có sẵn từ nhà cung cấp |
| `getModel(id)` | Lấy mô hình cụ thể theo định danh |

## Ví Dụ Nhà Cung Cấp Cơ Bản

Nhà cung cấp đơn giản dựa trên fetch:

```typescript
import { ModelProvider, ModelRequest, ModelResponse } from "@vinhnt-sdk/core";

function taoNhaCungCapHttp(baseUrl: string, apiKey: string): ModelProvider {
  return {
    id: "nha-cung-cap-http",
    name: "Nhà Cung Cấp HTTP",

    async generate(request: ModelRequest): Promise<ModelResponse> {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 4096,
        }),
      });

      if (!response.ok) {
        throw new Error(`Lỗi nhà cung cấp: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: data.model,
      };
    },

    async *stream(request: ModelRequest) {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Không có body phản hồi");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;
            const parsed = JSON.parse(data);
            const token = parsed.choices[0]?.delta?.content;
            if (token) yield { type: "token", content: token };
          }
        }
      }
    },

    listModels() {
      return [
        { id: "model-a", name: "Mô Hình A", maxTokens: 4096 },
        { id: "model-b", name: "Mô Hình B", maxTokens: 8192 },
      ];
    },

    getModel(id) {
      const models = this.listModels();
      return models.find((m) => m.id === id) ?? null;
    },
  };
}
```

## Nhà Cung Cấp Với Giá

Thêm theo dõi chi phí vào nhà cung cấp:

```typescript
import { ModelProvider, ModelRequest, PricingConfig } from "@vinhnt-sdk/core";

function taoNhaCungCapGia(
  baseUrl: string,
  apiKey: string,
  gia: PricingConfig
): ModelProvider {
  return {
    id: "nha-cung-cap-gia",
    name: "Nhà Cung Cấp Có Giá",
    pricing: gia,

    async generate(request) {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
        }),
      });

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        model: data.model,
      };
    },

    async *stream(request) {
      // Triển khai streaming...
    },

    listModels() {
      return Object.keys(gia).map((id) => ({
        id,
        name: id,
        maxTokens: 4096,
      }));
    },

    getModel(id) {
      if (!(id in gia)) return null;
      return { id, name: id, maxTokens: 4096 };
    },
  };
}

// Sử dụng
const nhaCungCap = taoNhaCungCapGia(
  "https://api.example.com",
  "sk-xxx",
  {
    "model-a": { input: 0.001, output: 0.002 },
    "model-b": { input: 0.003, output: 0.006 },
  }
);
```

## Đăng Ký Với InMemoryModelRegistry

Đăng ký nhà cung cấp với registry mô hình:

```typescript
import { InMemoryModelRegistry, ModelProvider } from "@vinhnt-sdk/core";

const registry = new InMemoryModelRegistry();

// Đăng ký nhà cung cấp
const nhaCungCap = taoNhaCungCapHttp("https://api.openai.com", "sk-xxx");
registry.register(nhaCungCap);

// Đăng ký với bí danh
registry.register(nhaCungCap, { alias: "openai" });

// Đăng ký nhiều nhà cung cấp
const nhaCungCaps = [nhaCungCapA, nhaCungCapB];
registry.registerBatch(nhaCungCaps);

// Tìm nhà cung cấp
const resolved = registry.resolve("nha-cung-cap-cua-toi");

// Liệt kê tất cả nhà cung cấp đã đăng ký
const tatCaNhaCungCap = registry.list();
```

## Định tuyến Mô hình Đa路由

Định tuyến yêu cầu đến nhà cung cấp khác nhau dựa trên tên mô hình:

```typescript
import { ModelProvider, ModelRequest } from "@vinhnt-sdk/core";

function taoNhaCungCapDinhTuyen(
  nhaCungCaps: Map<string, ModelProvider>
): ModelProvider {
  return {
    id: "nha-cung-cap-dinh-tuyen",
    name: "Nhà Cung Cấp Định Tuyến",

    async generate(request) {
      const nhaCungCap = nhaCungCaps.get(request.model);
      if (!nhaCungCap) {
        throw new Error(`Không có nhà cung cấp cho mô hình: ${request.model}`);
      }
      return nhaCungCap.generate(request);
    },

    async *stream(request) {
      const nhaCungCap = nhaCungCaps.get(request.model);
      if (!nhaCungCap) {
        throw new Error(`Không có nhà cung cấp cho mô hình: ${request.model}`);
      }
      yield* nhaCungCap.stream(request);
    },

    listModels() {
      return Array.from(nhaCungCaps.values()).flatMap((p) => p.listModels());
    },

    getModel(id) {
      for (const nhaCungCap of nhaCungCaps.values()) {
        const model = nhaCungCap.getModel(id);
        if (model) return model;
      }
      return null;
    },
  };
}

// Sử dụng
const dinhTuyen = taoNhaCungCapDinhTuyen(
  new Map([
    ["gpt-4", nhaCungCapOpenAI],
    ["claude-3", nhaCungCapAnthropic],
    ["gemini-pro", nhaCungCapGoogle],
  ])
);
```

## FakeModelProvider Cho Kiểm Thử

Sử dụng nhà cung cấp giả trong kiểm thử:

```typescript
import { FakeModelProvider } from "@vinhnt-sdk/core/testing";

describe("tích hợp agent", () => {
  it("should xử lý tin nhắn người dùng", async () => {
    const nhaCungCapGia = new FakeModelProvider({
      responses: ["Xin chào! Tôi có thể giúp gì?"],
    });

    const agent = taoAgent({ provider: nhaCungCapGia });
    const phanHoi = await agent.chat("Xin chào");

    expect(phanHoi.content).toBe("Xin chào! Tôi có thể giúp gì?");
    expect(nhaCungCapGia.requests).toHaveLength(1);
  });

  it("should xử lý streaming", async () => {
    const nhaCungCapGia = new FakeModelProvider({
      streamingTokens: ["Xin", " ", "chào"],
    });

    const tokens: string[] = [];
    for await (const token of nhaCungCapGia.stream(request)) {
      tokens.push(token.content);
    }

    expect(tokens.join("")).toBe("Xin chào");
  });
});
```

## Các Thực Hành Tốt Nhất

### Xử Lý Lỗi

Luôn bọc lời gọi nhà cung cấp trong try-catch:

```typescript
async function generateAnToan(
  nhaCungCap: ModelProvider,
  request: ModelRequest
): Promise<ModelResponse | null> {
  try {
    return await nhaCungCap.generate(request);
  } catch (error) {
    if (error instanceof RateLimitError) {
      await delay(error.retryAfter ?? 1000);
      return nhaCungCap.generate(request);
    }
    if (error instanceof AuthenticationError) {
      console.error("API key không hợp lệ");
      return null;
    }
    throw error;
  }
}
```

### Hỗ Trợ Hủy

Xử lý tín hiệu hủy cho yêu cầu chạy lâu:

```typescript
async function generateVoiHuy(
  nhaCungCap: ModelProvider,
  request: ModelRequest,
  signal?: AbortSignal
): Promise<ModelResponse> {
  signal?.throwIfAborted();
  return nhaCungCap.generate({ ...request, signal });
}
```

### Thực Hành Streaming Tốt Nhất

Luôn xử lý áp suất ngược và lỗi trong stream:

```typescript
async function* streamAnToan(
  nhaCungCap: ModelProvider,
  request: ModelRequest
) {
  const iterator = nhaCungCap.stream(request);

  try {
    for await (const chunk of iterator) {
      yield chunk;
    }
  } catch (error) {
    iterator.return?.();
    throw error;
  }
}
```

## Tích Hợp Vercel AI SDK

Tích hợp với Vercel AI SDK để có các tính năng nâng cao:

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4"),
    messages,
  });

  return result.toDataStreamResponse();
}
```

## Bước Tiếp Theo

- Xem hướng dẫn [Tạo Công Cụ](/guides/creating-tools) để thêm hỗ trợ công cụ
- Xem tham chiếu API đầy đủ cho `ModelProvider`
- Khám phá các mẫu định tuyến nâng cao trong ví dụ
