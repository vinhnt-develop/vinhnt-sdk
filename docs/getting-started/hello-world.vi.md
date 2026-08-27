---
title: "Hello World"
description: "Xây dựng AI agent đầu tiên trong 5 phút"
lang: "vi"
type: "guide"
category: "Getting Started"
sidebarPosition: 2
sidebarLabel: "Hello World"
tags: [quickstart, core, tools]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Hello World

Xây dựng một AI agent hoạt động trong **5 phút**. Copy, paste, chạy.

## Bạn Sẽ Xây Dựng Gì

Một agent đơn giản:
1. Nhận prompt từ bạn
2. Gọi LLM để tạo response
3. Sử dụng tool tùy chỉnh để làm gì đó

## Yêu Cầu

- Node.js >= 20
- pnpm >= 9
- API key từ [OpenAI](https://platform.openai.com/api-keys), [DeepSeek](https://platform.deepseek.com/), hoặc bất kỳ nhà cung cấp nào tương thích với OpenAI

## Bước 1: Tạo Project

```bash
mkdir my-agent && cd my-agent
pnpm init
pnpm add @vinhnt-sdk/core @vinhnt-sdk/schema zod
pnpm add -D typescript @types/node
```

## Bước 2: Tạo `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

## Bước 3: Tạo `src/index.ts`

```typescript
import { AgentKernel, defineTool } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";
import { z } from "zod";

// 1. Định nghĩa tool
const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform arithmetic calculations",
  risk: "read",
  input: z.object({
    expression: z.string().describe("Math expression like '2 + 3'"),
  }),
  async execute(input) {
    const parts = input.expression.match(/^(\d+)\s*([+\-*/])\s*(\d+)$/);
    if (!parts) {
      throw new Error("Invalid format. Use: number operator number (e.g. '2 + 3')");
    }
    const [, a, op, b] = parts;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);

    switch (op) {
      case "+": return { result: numA + numB };
      case "-": return { result: numA - numB };
      case "*": return { result: numA * numB };
      case "/":
        if (numB === 0) throw new Error("Division by zero");
        return { result: numA / numB };
      default: throw new Error(`Unknown operator: ${op}`);
    }
  },
});

// 2. Tạo model provider
const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: "gpt-4o-mini",
});

// 3. Tạo kernel
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [calculatorTool.toDefinition()],
  maxSteps: 10,
});

// 4. Chạy agent
async function main() {
  console.log("Agent đang chạy...");

  const handle = kernel.run(
    "Calculate 15 * 7 + 3",
    {
      requestId: "req-1",
      traceId: "trace-1",
      actorId: "user",
      tenantId: "default",
    }
  );

  await handle.completed;
  console.log("Xong!");
}

main().catch(console.error);
```

## Bước 4: Đặt API Key

```bash
# Linux/Mac
export OPENAI_API_KEY="sk-your-key-here"

# Windows PowerShell
$env:OPENAI_API_KEY="sk-your-key-here"
```

## Bước 5: Chạy

```bash
npx tsx src/index.ts
```

**Kết quả mong đợi:**
```
Agent đang chạy...
Xong!
```

## Cách Thức Hoạt Động

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Your Prompt │────▶│  AgentKernel │────▶│  LLM (GPT)  │
└─────────────┘     │              │     └─────────────┘
                    │  ┌─────────┐ │
                    │  │  Tools  │ │◀── calculatorTool
                    │  └─────────┘ │
                    └──────────────┘
```

1. **`defineTool()`** — Tạo tool với Zod schema để validate input
2. **`OpenAICompatibleProvider`** — Kết nối API OpenAI (hoặc bất kỳ nhà cung cấp tương thích nào)
3. **`AgentKernel`** — Điều phối vòng lặp agent: prompt → LLM → tool calls → response
4. **`kernel.run()`** — Bắt đầu agent và chờ hoàn thành

## Sử Dụng Nhà Cung Cấp Khác

### DeepSeek

```typescript
const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY!,
  defaultModel: "deepseek-chat",
});
```

### Ollama (Local)

```typescript
const model = new OpenAICompatibleProvider({
  baseUrl: "http://localhost:11434/v1",
  defaultModel: "llama3",
});
```

## Thêm Tool Mới

```typescript
import { defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

const weatherTool = defineTool({
  name: "get_weather",
  description: "Get current weather for a city",
  risk: "read",
  input: z.object({
    city: z.string().describe("City name"),
  }),
  async execute(input) {
    // Trong app thực tế, gọi weather API
    return { temperature: 25, condition: "sunny", city: input.city };
  },
});

// Thêm vào kernel
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [
    calculatorTool.toDefinition(),
    weatherTool.toDefinition(),
  ],
  maxSteps: 10,
});
```

## Bước Tiếp Theo

- [Installation](/getting-started/installation) — Hướng dẫn cài đặt đầy đủ
- [Configuration](/getting-started/configuration) — Environment, credentials, settings
- [Creating Tools](/guides/creating-tools) — Xây dựng tool tùy chỉnh
- [Express Integration](/frameworks/express) — Sử dụng trong Express.js
- [NestJS Integration](/frameworks/nestjs) — Sử dụng trong NestJS
