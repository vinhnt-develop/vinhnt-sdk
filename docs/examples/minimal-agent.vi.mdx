---
title: "Agent tối giản"
description: "Xây dựng agent tính toán"
lang: "vi"
type: "example"
category: "Examples"
sidebarPosition: 1
---

# Agent tối giản

Thiết lập agent đơn giản nhất với một tool tùy chỉnh.

## Luồng xử lý

```mermaid
sequenceDiagram
    participant U as Bạn
    participant A as Agent
    participant M as OpenAI
    participant T as Calculator

    U->>A: "42 * 17 bằng bao nhiêu?"
    A->>M: Gửi prompt + tools
    M->>A: Gọi calculator(42, 17, multiply)
    A->>T: Thực thi: 42 * 17
    T->>A: { result: 714 }
    A->>M: Kết quả tool: 714
    M->>A: "42 * 17 = 714"
    A->>U: "42 * 17 = 714"
```

## package.json

```json
{
  "name": "minimal-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx agent.ts"
  },
  "dependencies": {
    "@vinhnt-sdk/core": "^0.1.3",
    "@vinhnt-sdk/tools": "^0.1.3",
    "@vinhnt-sdk/session": "^0.1.3",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.5.0"
  }
}
```

## agent.ts

```typescript
import { AgentKernel } from "@vinhnt-sdk/core";
import { defineTool } from "@vinhnt-sdk/tools";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { z } from "zod";

// 1. Định nghĩa tool tính toán
const calculatorTool = defineTool({
  name: "calculator",
  description: "Thực hiện phép tính cơ bản. Dùng cho các câu hỏi về toán học.",
  risk: "read",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
        description: "Phép tính cần thực hiện",
      },
      a: { type: "number", description: "Số hạng thứ nhất" },
      b: { type: "number", description: "Số hạng thứ hai" },
    },
    required: ["operation", "a", "b"],
  },
  execute: async (params) => {
    const results: Record<string, number> = {
      add: params.a + params.b,
      subtract: params.a - params.b,
      multiply: params.a * params.b,
      divide: params.a / params.b,
    };
    return { result: results[params.operation] };
  },
});

// 2. Tạo model provider
const model = {
  id: "openai-gpt4o",
  provider: "openai",
  model: "gpt-4o",
  capabilities: { streaming: true, toolCalling: true, vision: false },
  async *stream(request: any) {
    // Triển khai với AI SDK bạn chọn
    // Ví dụ sử dụng Vercel AI SDK:
    // const { streamText } = await import("ai");
    // const result = streamText({
    //   model: openai("gpt-4o"),
    //   messages: request.messages,
    // });
    // yield* result.textStream;
  },
};

// 3. Tạo kernel
const kernel = new AgentKernel({
  model,
  tools: [calculatorTool],
  store: new NullRunEventStore(),
});

// 4. Chạy agent
async function main() {
  const prompt = process.argv[2] || "42 * 17 bằng bao nhiêu?";
  console.log(`Prompt: ${prompt}\n`);

  // Cách 1: Chạy đơn giản
  const result = await kernel.run(prompt);
  console.log(`Câu trả lời: ${result}`);

  // Cách 2: Chạy với streaming sự kiện
  const runHandle = kernel.createRunHandle(prompt, {
    requestId: "req-1",
    traceId: "trace-1",
    actorId: "user-1",
    tenantId: "tenant-1",
  });

  runHandle.onEvent((event) => {
    if (event.type === "agent.completed") {
      console.log(`Trạng thái: ${event.status}`);
    }
  });

  // Hoặc duyệt qua các sự kiện
  for await (const event of runHandle.events()) {
    if (event.type === "agent.completed") {
      console.log(`Hoàn thành với trạng thái: ${event.status}`);
    }
  }

  const runResult = await runHandle.completed;
  console.log(`\nCâu trả lời: ${runResult.output}`);
}

main();
```

## Chạy

```bash
npx tsx agent.ts "42 * 17 bằng bao nhiêu?"
```

## Khái niệm chính

- **`defineTool`** — Tạo tool có kiểu dữ liệu với tên, mô tả, mức độ rủi ro, tham số JSON Schema và hàm thực thi.
- **`AgentKernel`** — Engine chính điều phối các lệnh gọi LLM và thực thi tool.
- **`NullRunEventStore`** — Store sự kiện rỗng cho thiết lập đơn giản. Thay thế bằng store lưu trữ cho môi trường production.
- **Mức độ rủi ro** — `"read"` cho thao tác an toàn, `"write"` cho thay đổi, `"destructive"` cho hành động không thể hoàn tác, `"external"` cho gọi API.
