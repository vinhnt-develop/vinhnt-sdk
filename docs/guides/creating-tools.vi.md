---
title: "Creating Tools"
description: "Xây dựng tool tùy chỉnh với Zod schemas"
lang: "vi"
type: "guide"
category: "Guides"
sidebarPosition: 1
sidebarLabel: "Creating Tools"
tags: [tools, define-tool, zod]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Creating Tools

Tools cho phép agent tương tác với thế giới bên ngoài. Đây là cách xây dựng chúng.

## Tool Cơ Bản

```typescript
import { defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

const weatherTool = defineTool({
  name: "get_weather",
  description: "Get current weather for a city",
  risk: "read",
  input: z.object({
    city: z.string().describe("City name, e.g. 'Hanoi'"),
  }),
  async execute(input) {
    // Gọi weather API ở đây
    return {
      city: input.city,
      temperature: 25,
      condition: "sunny",
    };
  },
});

// Đăng ký với kernel
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [weatherTool.toDefinition()],
});
```

## Tool Risk Levels

Mỗi tool phải khai báo risk level:

| Risk | Mô tả | Ví dụ |
|------|-------|-------|
| `read` | Chỉ đọc, không có side effects | `get_weather`, `read_file` |
| `write` | Thay đổi state | `write_file`, `send_email` |
| `destructive` | Thay đổi không thể đảo ngược | `delete_file`, `drop_table` |
| `external` | Gọi API bên ngoài | `web_search`, `http_request` |

```typescript
const deleteTool = defineTool({
  name: "delete_file",
  description: "Delete a file permanently",
  risk: "destructive",  // Yêu cầu approval rõ ràng
  input: z.object({
    path: z.string().describe("File path to delete"),
  }),
  async execute(input) {
    // Xóa file...
    return { deleted: input.path };
  },
});
```

## Tool với Output Schema

```typescript
const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform arithmetic calculations",
  risk: "read",
  input: z.object({
    expression: z.string().describe("Math expression like '2 + 3'"),
  }),
  output: z.object({    // Tùy chọn: validate output
    result: z.number(),
  }),
  async execute(input) {
    const parts = input.expression.match(/^(\d+)\s*([+\-*/])\s*(\d+)$/);
    if (!parts) throw new Error("Invalid format");
    const [, a, op, b] = parts;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);

    switch (op) {
      case "+": return { result: numA + numB };
      case "-": return { result: numA - numB };
      case "*": return { result: numA * numB };
      case "/": return { result: numA / numB };
      default: throw new Error(`Unknown operator: ${op}`);
    }
  },
});
```

## Tool với Context

Tools nhận `ToolContext` với thông tin hữu ích:

```typescript
const readFileTool = defineTool({
  name: "read_file",
  description: "Read file contents",
  risk: "read",
  input: z.object({
    path: z.string().describe("File path relative to workspace"),
  }),
  async execute(input, ctx) {
    // ctx chứa:
    // - ctx.signal: AbortSignal để hủy
    // - ctx.runId: Run ID hiện tại
    // - ctx.toolCallId: ID của tool call này

    const content = await readFile(input.path, "utf-8");
    return { content };
  },
});
```

## Tool với Timeout

```typescript
const webSearchTool = defineTool({
  name: "web_search",
  description: "Search the web",
  risk: "external",
  timeoutMs: 10000,  // Timeout 10 giây
  input: z.object({
    query: z.string().describe("Search query"),
  }),
  async execute(input) {
    const results = await searchWeb(input.query);
    return { results };
  },
});
```

## Sử Dụng Built-in Tools

SDK cung cấp các tool có sẵn:

```typescript
import {
  createReadFileTool,
  createWriteFileTool,
  createEditFileTool,
  createShellTool,
  createWebSearchTool,
  createGitStatusTool,
} from "@vinhnt-sdk/core";

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [
    createReadFileTool({ workspaceRoot: "/my/project" }),
    createWriteFileTool({ workspaceRoot: "/my/project" }),
    createEditFileTool({ workspaceRoot: "/my/project" }),
    createShellTool({ workspaceRoot: "/my/project" }),
    createWebSearchTool({ apiKey: process.env.TAVILY_API_KEY }),
    createGitStatusTool({ workspaceRoot: "/my/project" }),
  ],
});
```

## Kết Hợp Tools

```typescript
const tools = [
  calculatorTool.toDefinition(),
  weatherTool.toDefinition(),
  readFileTool.toDefinition(),
];

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools,
  maxSteps: 20,
});
```

## Bước Tiếp Theo

- [Tool Permissions](/guides/tool-permissions) — Kiểm soát những gì tool có thể làm
- [Creating Plugins](/guides/creating-plugins) — Mở rộng agent với hooks
- [Express API](/frameworks/express) — Sử dụng tools trong Express.js
