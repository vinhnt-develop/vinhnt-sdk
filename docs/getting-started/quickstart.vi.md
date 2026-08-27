---
title: Bắt đầu nhanh
description: Xây dựng agent hoàn chỉnh trong 5 phút
lang: vi
type: guide
category: Getting Started
sidebarPosition: 3
---

# Bắt đầu nhanh
Xây dựng agent hoàn chỉnh với vinhnt-sdk trong 5 phút.

## Yêu cầu

- **Node.js** 20+
- **pnpm** (khuyến nghị) hoặc npm/yarn
- **TypeScript** 5.0+
- API key LLM (DeepSeek, OpenAI hoặc Anthropic)

## Bước 1: Tạo dự án

```bash
mkdir my-agent && cd my-agent
pnpm init
pnpm add @vinhnt-sdk/schema @vinhnt-sdk/core @vinhnt-sdk/tools \
  @vinhnt-sdk/session @vinhnt-sdk/provider-openai-compatible
pnpm add -D typescript @types/node
```

Tạo `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  }
}
```

Đặt API key:

```bash
export DEEPSEEK_API_KEY=sk-...
```

## Bước 2: Tạo tool

Tool là khối xây dựng cơ bản. Mỗi tool có tên, mô tả, mức độ rủi ro, schema đầu vào và hàm thực thi.

```typescript
// src/tools.ts
import { defineTool } from "@vinhnt-sdk/tools";
import { z } from "zod";

export const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform basic arithmetic operations",
  risk: "read",
  input: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number().describe("First operand"),
    b: z.number().describe("Second operand"),
  }),
  async execute(input) {
    switch (input.operation) {
      case "add":      return input.a + input.b;
      case "subtract": return input.a - input.b;
      case "multiply": return input.a * input.b;
      case "divide":   return input.a / input.b;
    }
  },
});
```

### Mức độ rủi ro

| Rủi ro | Mô tả |
|--------|-------|
| `read` | Chỉ đọc, không có tác dụng phụ |
| `write` | Thay đổi trạng thái (file, dữ liệu) |
| `destructive` | Thay đổi không thể đảo ngược (xóa, ghi đè) |
| `external` | Gọi dịch vụ bên ngoài |

## Bước 3: Tạo kernel

`AgentKernel` điều phối các lệnh gọi LLM, thực thi tool và quản lý quyền.

```typescript
// src/kernel.ts
import { AgentKernel } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { createDeepSeekProvider } from "@vinhnt-sdk/provider-openai-compatible";
import { calculatorTool } from "./tools.js";

const model = createDeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [calculatorTool.toDefinition()],
  maxSteps: 10,
});

export { kernel };
```

## Bước 4: Chạy agent

### Chạy đơn giản

```typescript
// src/main.ts
import { kernel } from "./kernel.js";
const ctx = { requestId: "req-1" as import("@vinhnt-sdk/schema").RequestId };
const handle = kernel.run("42 * 37 bao nhiêu? Hãy dùng tool calculator.", ctx);
await handle.completed;
console.log("Hoàn thành:", handle.runId);
```

### Phát sự kiện

```typescript
// src/stream.ts
import { kernel } from "./kernel.js";
const ctx = { requestId: "req-2" as import("@vinhnt-sdk/schema").RequestId };

const handle = kernel.createRunHandle(
  "Tính (15 + 27) rồi nhân 3",
  ctx,
);

for await (const event of handle.events()) {
  switch (event.type) {
    case "tool.calling":  console.log(`Tool: ${event.toolId}`); break;
    case "tool.completed": console.log(`Kết quả: ${event.result}`); break;
    case "model.thinking": console.log("Agent đang suy luận..."); break;
  }
}

const result = await handle.completed;
console.log("Trạng thái:", result.status);
```

## Ví dụ hoàn chỉnh
Full `src/index.ts`:

```typescript
import { AgentKernel } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { createDeepSeekProvider } from "@vinhnt-sdk/provider-openai-compatible";
import { defineTool } from "@vinhnt-sdk/tools";
import { z } from "zod";
import type { RequestId } from "@vinhnt-sdk/schema";
const calculator = defineTool({
  name: "calculator",
  description: "Perform basic arithmetic operations",
  risk: "read",
  input: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number().describe("First operand"),
    b: z.number().describe("Second operand"),
  }),
  async execute(input) {
    switch (input.operation) {
      case "add":      return input.a + input.b;
      case "subtract": return input.a - input.b;
      case "multiply": return input.a * input.b;
      case "divide":   return input.a / input.b;
    }
  },
});
const model = createDeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY! });
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [calculator.toDefinition()],
});
const ctx = { requestId: "quickstart" as RequestId };
const handle = kernel.run("42 * 37 bao nhiêu?", ctx);
await handle.completed;
console.log("Xong! Run ID:", handle.runId);
```

```bash
npx tsx src/index.ts
```
## Bước tiếp theo
- [Hướng dẫn Tool](/docs/guides/tools) — Tool tích hợp sẵn và mẫu tool tùy chỉnh
- [Quyền](/docs/guides/permissions) — Cấu hình cổng phê duyệt tool
- [Quản lý Session](/docs/guides/sessions) — Lưu trữ trạng thái hội thoại
- [Plugin](/docs/guides/plugins) — Mở rộng kernel bằng hook
- [Sub-Agent](/docs/guides/sub-agents) — Giao nhiệm vụ cho agent chuyên biệt
