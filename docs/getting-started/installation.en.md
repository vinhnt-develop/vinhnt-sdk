---
title: "Installation"
description: "Install vinhnt-sdk and its packages"
lang: "en"
type: "reference"
category: "Getting Started"
sidebarPosition: 1
sidebarLabel: "Installation"
tags: [setup, install]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Installation

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (recommended) or npm >= 10

## Quick Install

```bash
# Create a new project
mkdir my-agent && cd my-agent
pnpm init

# Install core packages
pnpm add @vinhnt-sdk/core @vinhnt-sdk/schema zod

# Install provider (choose one)
pnpm add @vinhnt-sdk/provider-openai-compatible

# Install dev tools
pnpm add -D typescript @types/node tsx
```

## Package Overview

| Package | Purpose | When to Install |
|---------|---------|-----------------|
| `@vinhnt-sdk/core` | Agent kernel, tools, orchestration | **Always** |
| `@vinhnt-sdk/schema` | Types, contracts, validation | **Always** |
| `@vinhnt-sdk/provider-openai-compatible` | OpenAI/DeepSeek/Ollama provider | **Always** |
| `@vinhnt-sdk/tools` | Built-in tools (file, shell, git) | Optional |
| `@vinhnt-sdk/knowledge` | Memory, context compression | Optional |
| `@vinhnt-sdk/security` | Prompt injection protection | Optional |
| `@vinhnt-sdk/plugin` | Plugin SDK | Optional |
| `@vinhnt-sdk/lsp` | Language Server Protocol | Optional |
| `@vinhnt-sdk/mcp` | Model Context Protocol | Optional |
| `@vinhnt-sdk/guard` | Circuit breaker, rate limiting | Optional |
| `@vinhnt-sdk/sandbox` | Process sandboxing | Optional |
| `@vinhnt-sdk/session` | Session persistence | Optional |
| `@vinhnt-sdk/permission` | Permission system | Optional |
| `@vinhnt-sdk/step-executor` | Tool execution engine | Optional |
| `@vinhnt-sdk/event` | Event bus | Optional |
| `@vinhnt-sdk/trace` | Telemetry, cost tracking | Optional |
| `@vinhnt-sdk/config` | Configuration loading | Optional |

## TypeScript Setup

Create `tsconfig.json`:

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

## Verify Installation

Create `src/test.ts`:

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

console.log("Installation OK!");
```

Run:

```bash
npx tsx src/test.ts
```

Expected output:

```
Installation OK!
```

## Next Steps

- [Hello World](/getting-started/hello-world) — Build your first agent
- [Configuration](/getting-started/configuration) — Environment and credentials
