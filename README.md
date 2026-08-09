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
│   @vinhnt-sdk/core                                         │
│   ┌─────────────────┐                                      │
│   │ AgentKernel     │                                      │
│   │ Orchestration   │                                      │
│   │ Workflows       │                                      │
│   └─────────────────┘                                      │
├─────────────────────────────────────────────────────────────┤
│   @vinhnt-sdk/tools    @vinhnt-sdk/knowledge               │
│   ┌─────────────────┐  ┌─────────────────┐                 │
│   │ Built-in Tools  │  │ Memory & RAG    │                 │
│   │ File/Shell/Git  │  │ Compression     │                 │
│   └─────────────────┘  └─────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│   @vinhnt-sdk/security  @vinhnt-sdk/plugin                 │
│   ┌─────────────────┐  ┌─────────────────┐                 │
│   │ Prompt Protect  │  │ Plugin SDK      │                 │
│   │ Secret Redact   │  │ TypeScript Hooks│                 │
│   └─────────────────┘  └─────────────────┘                 │
├─────────────────────────────────────────────────────────────┤
│   @vinhnt-sdk/schema                                       │
│   ┌─────────────────┐                                      │
│   │ Types & Schemas │                                      │
│   │ Contracts       │                                      │
│   └─────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@vinhnt-sdk/schema` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/schema.svg)](https://npmjs.com/package/@vinhnt-sdk/schema) | Types, contracts, model interfaces, session store |
| `@vinhnt-sdk/core` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/core.svg)](https://npmjs.com/package/@vinhnt-sdk/core) | Agent kernel, orchestration, workflows, re-exports |
| `@vinhnt-sdk/tools` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/tools.svg)](https://npmjs.com/package/@vinhnt-sdk/tools) | Built-in tools (file, shell, git, web, search) |
| `@vinhnt-sdk/knowledge` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/knowledge.svg)](https://npmjs.com/package/@vinhnt-sdk/knowledge) | Memory, context compression, learning engine |
| `@vinhnt-sdk/security` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/security.svg)](https://npmjs.com/package/@vinhnt-sdk/security) | Prompt injection protection, secret redaction |
| `@vinhnt-sdk/plugin` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/plugin.svg)](https://npmjs.com/package/@vinhnt-sdk/plugin) | Plugin SDK with TypeScript hooks |
| `@vinhnt-sdk/lsp` | [![npm](https://img.shields.io/npm/v/@vinhnt-sdk/lsp.svg)](https://npmjs.com/package/@vinhnt-sdk/lsp) | Language Server Protocol integration |

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
    // Safe evaluation - parse and compute without eval
    const parts = input.expression.match(/^(\d+)\s*([+\-*/])\s*(\d+)$/);
    if (!parts) {
      throw new Error("Invalid expression format. Use: number operator number");
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
- **Security** — Prompt injection protection, secret redaction
- **LSP Integration** — Language Server Protocol for code intelligence

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
pnpm typecheck
```

## Documentation

- [Architecture Guide](docs/guides/architecture.md)
- [Examples](docs/examples/)
- [Package Docs](docs/packages/)

## License

[MIT](LICENSE)
