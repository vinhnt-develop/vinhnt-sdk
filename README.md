# vinhnt-sdk

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9-orange)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org)

> AI Agent SDK — modular TypeScript libraries for building AI coding agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Applications                         │
│                    (Your AI Agent App)                      │
├─────────────────────────────────────────────────────────────┤
│   @vinhnt-sdk/core          @vinhnt-sdk/ui                  │
│   ┌─────────────────┐      ┌─────────────────┐             │
│   │ AgentKernel     │      │ React Components│             │
│   │ Tool System     │      └─────────────────┘             │
│   │ Session Mgmt    │                                      │
│   │ Permissions     │      @vinhnt-sdk/a2a                  │
│   │ Plugin System   │      ┌─────────────────┐             │
│   │ Workflows       │      │ Agent-to-Agent  │             │
│   └─────────────────┘      └─────────────────┘             │
├─────────────────────────────────────────────────────────────┤
│   @vinhnt-sdk/mcp    @vinhnt-sdk/lsp    @vinhnt-sdk/rag    │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│   │ MCP Client  │    │ LSP Client  │    │ RAG Engine  │    │
│   └─────────────┘    └─────────────┘    └─────────────┘    │
├─────────────────────────────────────────────────────────────┤
│   @vinhnt-sdk/plugin    @vinhnt-sdk/adapters                │
│   ┌─────────────────┐  ┌─────────────────┐                 │
│   │ Plugin SDK      │  │ OpenAI/Anthropic│                 │
│   └─────────────────┘  └─────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│   @vinhnt-sdk/schema         @vinhnt-sdk/config             │
│   ┌─────────────────┐       ┌─────────────────┐            │
│   │ Zod Schemas     │       │ Config Loading  │            │
│   │ Branded IDs     │       │ YAML/JSON/JSONC │            │
│   │ Error Classes   │       └─────────────────┘            │
│   └─────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@vinhnt-sdk/schema` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/schema.svg)](https://npmjs.com/package/@vinhnt-sdk/schema) | Shared Zod schemas, branded IDs, error classes |
| `@vinhnt-sdk/core` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/core.svg)](https://npmjs.com/package/@vinhnt-sdk/core) | Agent kernel, tool system, sessions, plugins, permissions |
| `@vinhnt-sdk/config` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/config.svg)](https://npmjs.com/package/@vinhnt-sdk/config) | Configuration loading (YAML, JSON, JSONC) |
| `@vinhnt-sdk/plugin` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/plugin.svg)](https://npmjs.com/package/@vinhnt-sdk/plugin) | Plugin SDK with TypeScript hooks |
| `@vinhnt-sdk/mcp` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/mcp.svg)](https://npmjs.com/package/@vinhnt-sdk/mcp) | Model Context Protocol client |
| `@vinhnt-sdk/lsp` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/lsp.svg)](https://npmjs.com/package/@vinhnt-sdk/lsp) | Language Server Protocol integration |
| `@vinhnt-sdk/rag` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/rag.svg)](https://npmjs.com/package/@vinhnt-sdk/rag) | Retrieval-Augmented Generation |
| `@vinhnt-sdk/store` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/store.svg)](https://npmjs.com/package/@vinhnt-sdk/store) | Persistent storage (SQLite via Drizzle) |
| `@vinhnt-sdk/otel` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/otel.svg)](https://npmjs.com/package/@vinhnt-sdk/otel) | Observability (logging, tracing, audit) |
| `@vinhnt-sdk/adapters` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/adapters.svg)](https://npmjs.com/package/@vinhnt-sdk/adapters) | LLM provider adapters (OpenAI, Anthropic) |
| `@vinhnt-sdk/a2a` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/a2a.svg)](https://npmjs.com/package/@vinhnt-sdk/a2a) | Agent-to-Agent protocol |
| `@vinhnt-sdk/ui` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/ui.svg)](https://npmjs.com/package/@vinhnt-sdk/ui) | React UI components |

## Quick Start

```bash
npm install @vinhnt-sdk/core @vinhnt-sdk/schema
```

```typescript
import { AgentKernel, defineTool, InMemoryEventBus } from "@vinhnt-sdk/core";
import { z } from "zod";

// Define a tool
const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform arithmetic calculations",
  risk: "read",
  input: z.object({
    expression: z.string(),
  }),
  async execute(input) {
    // Safe eval for math expressions only
    const result = Function(`"use strict"; return (${input.expression})`)();
    return { result: Number(result) };
  },
}).toDefinition();

// Create the kernel
const kernel = new AgentKernel({
  model: yourModelProvider,
  store: new InMemoryEventBus(),
  tools: [calculatorTool],
  maxSteps: 10,
});

// Run the agent
const handle = kernel.run("Calculate 2 + 2", {
  requestId: "req-1",
  traceId: "trace-1",
});

const result = await handle.completed;
console.log("Agent completed:", result);
```

## Key Features

- **Tool System** — Define tools with Zod schemas, JSON Schema, risk levels, and permission gating
- **Session Management** — Durable sessions with event sourcing and compaction
- **Plugin System** — TypeScript hooks for lifecycle events
- **Permissions** — Fine-grained allow/deny/ask rules with approval workflows
- **Workflows** — Graph-based sequential and parallel agent orchestration
- **A2A Protocol** — Agent-to-Agent communication with discovery
- **Observability** — Cost tracking, tracing, audit logging

## Security

- Prompt injection protection (unicode bidi, zero-width, XML tags)
- API key redaction in logs (OpenAI, Anthropic, GitHub, AWS)
- Plugin integrity verification (SHA-256 hash, allowlist)
- Process sandboxing with env sanitization

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Typecheck all packages
pnpm -r typecheck
```

## Documentation

- [Architecture Guide](.agents/instructions/architecture.md)
- [Coding Standards](.agents/instructions/coding-standards.md)
- [Security Rules](.agents/rules/security.md)
- [Examples](docs/examples/)

## License

[MIT](LICENSE)
