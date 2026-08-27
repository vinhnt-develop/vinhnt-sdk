# vinhnt-sdk

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9-orange)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org)

> AI Agent SDK — modular TypeScript libraries for building AI coding agents.

## Packages

| Package | Description |
|---------|-------------|
| `@vinhnt-sdk/schema` | Types, contracts, model interfaces, session store |
| `@vinhnt-sdk/config` | Configuration, credentials, environment validation |
| `@vinhnt-sdk/llm` | LLM providers, token metering, retry logic |
| `@vinhnt-sdk/tools` | Built-in tools (file, shell, git, web, search) |
| `@vinhnt-sdk/knowledge` | Memory, context compression, learning engine |
| `@vinhnt-sdk/security` | Prompt injection protection, secret redaction |
| `@vinhnt-sdk/plugin` | Plugin SDK with TypeScript hooks |
| `@vinhnt-sdk/lsp` | Language Server Protocol integration |
| `@vinhnt-sdk/mcp` | Model Context Protocol integration |
| `@vinhnt-sdk/guard` | Circuit breaker, rate limiting, timeouts |
| `@vinhnt-sdk/sandbox` | Process sandboxing with env sanitization |
| `@vinhnt-sdk/session` | Session management with event sourcing |
| `@vinhnt-sdk/permission` | Fine-grained allow/deny/ask permission rules |
| `@vinhnt-sdk/step-executor` | Tool execution with approval workflows |
| `@vinhnt-sdk/event` | Event bus, event sourcing, replay |
| `@vinhnt-sdk/trace` | Telemetry, cost tracking, observability |
| `@vinhnt-sdk/provider-openai-compatible` | OpenAI-compatible provider |
| `@vinhnt-sdk/core` | Agent kernel, orchestration, workflows |

## Quick Start

```bash
pnpm add @vinhnt-sdk/core @vinhnt-sdk/schema
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
- **MCP Integration** — Model Context Protocol for tool discovery

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

## License

[MIT](LICENSE)
