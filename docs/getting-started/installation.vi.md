---
title: "Installation"
description: "Cài đặt vinhnt-sdk và các package"
lang: "vi"
type: "reference"
category: "Getting Started"
sidebarPosition: 1
sidebarLabel: "Installation"
tags: [setup, install]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Installation

## Yêu Cầu

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (khuyến nghị) hoặc npm >= 10

## Cài Đặt Nhanh

```bash
# Tạo project mới
mkdir my-agent && cd my-agent
pnpm init

# Cài core packages
pnpm add @vinhnt-sdk/core @vinhnt-sdk/schema zod

# Cài provider (chọn một)
pnpm add @vinhnt-sdk/provider-openai-compatible

# Cài dev tools
pnpm add -D typescript @types/node tsx
```

## Tổng Quan Package

| Package | Mục Đích | Khi Nào Cài |
|---------|----------|-------------|
| `@vinhnt-sdk/core` | Agent kernel, tools, orchestration | **Luôn luôn** |
| `@vinhnt-sdk/schema` | Types, contracts, validation | **Luôn luôn** |
| `@vinhnt-sdk/provider-openai-compatible` | OpenAI/DeepSeek/Ollama provider | **Luôn luôn** |
| `@vinhnt-sdk/tools` | Built-in tools (file, shell, git) | Tùy chọn |
| `@vinhnt-sdk/knowledge` | Memory, context compression | Tùy chọn |
| `@vinhnt-sdk/security` | Prompt injection protection | Tùy chọn |
| `@vinhnt-sdk/plugin` | Plugin SDK | Tùy chọn |
| `@vinhnt-sdk/lsp` | Language Server Protocol | Tùy chọn |
| `@vinhnt-sdk/mcp` | Model Context Protocol | Tùy chọn |
| `@vinhnt-sdk/guard` | Circuit breaker, rate limiting | Tùy chọn |
| `@vinhnt-sdk/sandbox` | Process sandboxing | Tùy chọn |
| `@vinhnt-sdk/session` | Session persistence | Tùy chọn |
| `@vinhnt-sdk/permission` | Permission system | Tùy chọn |
| `@vinhnt-sdk/step-executor` | Tool execution engine | Tùy chọn |
| `@vinhnt-sdk/event` | Event bus | Tùy chọn |
| `@vinhnt-sdk/trace` | Telemetry, cost tracking | Tùy chọn |
| `@vinhnt-sdk/config` | Configuration loading | Tùy chọn |

## TypeScript Setup

Tạo `tsconfig.json`:

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

## Xác Nhận Cài Đặt

Tạo `src/test.ts`:

```typescript
import { AgentKernel } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";

const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: "gpt-4o-mini",
});

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [],
  maxSteps: 5,
});

console.log("Cài đặt thành công!");
```

Chạy:

```bash
npx tsx src/test.ts
```

Kết quả mong đợi:

```
Cài đặt thành công!
```

## Bước Tiếp Theo

- [Hello World](/getting-started/hello-world) — Xây dựng agent đầu tiên
- [Configuration](/getting-started/configuration) — Environment và credentials
