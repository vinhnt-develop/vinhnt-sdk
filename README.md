# vinhnt-sdk

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9-orange)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org)

> AI Agent SDK — modular TypeScript libraries for building AI coding agents.

## Packages (21 packages)

### Core Layer (Required)

| Package | Description |
|---------|-------------|
| `@vinhnt-sdk/provider-spec` | Provider specification — LanguageModelV1, Tool, ChatMessage, ContentBlock, error taxonomy |
| `@vinhnt-sdk/schema` | Types, contracts, branded IDs, wire format |
| `@vinhnt-sdk/config` | Credential resolution, settings, env validation |
| `@vinhnt-sdk/llm` | LLM adapter, registry, token metering |
| `@vinhnt-sdk/tools` | Tool framework + built-in tools (fs, shell, git, web, search) |
| `@vinhnt-sdk/sandbox` | Process isolation with host/process backends |
| `@vinhnt-sdk/guard` | Circuit breaker, loop detector, timeout guards, secret redaction |
| `@vinhnt-sdk/session` | Session management with event sourcing |
| `@vinhnt-sdk/permission` | Fine-grained allow/deny/ask permission rules |
| `@vinhnt-sdk/step-executor` | Execution kernel, tool dispatch, self-correction |
| `@vinhnt-sdk/core` | Agent kernel, orchestration, plugin management |
| `@vinhnt-sdk/provider-openai-compatible` | OpenAI-compatible provider + presets |

### Extension Layer (Optional)

| Package | Description |
|---------|-------------|
| `@vinhnt-sdk/plugin` | Plugin registry, manifest, lifecycle hooks |
| `@vinhnt-sdk/knowledge` | Memory, context compression, skill system |
| `@vinhnt-sdk/event` | Event bus, typed events, replay |
| `@vinhnt-sdk/mcp` | Model Context Protocol client (2026-07-28) |
| `@vinhnt-sdk/trace` | Telemetry, cost tracking, observability |
| `@vinhnt-sdk/lsp` | Language Server Protocol integration |
| `@vinhnt-sdk/guardrails` | Guardrail tripwires for inputs/outputs |
| `@vinhnt-sdk/workflow` | Workflow primitives (parallel, sequential, conditional) |
| `@vinhnt-sdk/test-utils` | Shared test utilities and mocks |

## Key Features (8-Phase Refactor)

- **Provider Specification** — Zero-dependency interfaces (`LanguageModelV1`, `Tool`, `ChatMessage`, `ContentBlock`) for provider implementors
- **Structured Error Taxonomy** — Domain + category + `isInstance()` for cross-module type checking (`SdkError`, `LlmError`, `ToolError`, `ConfigError`)
- **DynamicArgument Pattern** — Static or per-request dynamic configuration (inspired by Mastra)
- **prepareStep Callback** — Per-step model/message override before each agent step (Vercel AI SDK pattern)
- **ToolMiddleware** — Extensible tool execution hooks for logging, validation, and transformation
- **TelemetryProvider** — Pluggable observability interface for cost tracking and tracing
- **Test Utilities** — Shared mocks for `RunUsage`, `ChatMessage`, and test helpers

## Quick Start

```bash
pnpm add @vinhnt-sdk/core @vinhnt-sdk/provider-spec
```

```typescript
import { AgentKernel, defineTool, InMemoryEventBus } from "@vinhnt-sdk/core";
import { tool, type LanguageModelV1 } from "@vinhnt-sdk/provider-spec";
import { z } from "zod";

// Define a tool using provider-spec types
const calculatorTool = tool({
  name: "calculator",
  description: "Perform arithmetic calculations",
  inputSchema: {
    type: "object",
    properties: { expression: { type: "string" } },
    required: ["expression"],
  },
  riskLevel: "read",
  async execute(input, context) {
    const parts = (input as { expression: string }).expression.match(
      /^(\d+)\s*([+\-*/])\s*(\d+)$/
    );
    if (!parts) throw new Error("Invalid expression. Use: number operator number");
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

// Create the kernel with DynamicArgument for maxSteps
const kernel = new AgentKernel({
  model: yourModelProvider,
  store: new InMemoryEventBus(),
  tools: [calculatorTool],
  maxSteps: (ctx) => (ctx复杂 ? 20 : 10), // Dynamic per request
});

// Run with prepareStep callback for per-step model override
const handle = kernel.run("Calculate 2 + 2", {
  requestId: "req-1",
  traceId: "trace-1",
  prepareStep: async ({ step, model, messages }) => {
    // Override model for specific steps
    if (step === 3) return { model: fallbackModel };
    return {}; // Use defaults
  },
});

const result = await handle.completed;
console.log("Agent completed:", result);
```

## Error Handling

```typescript
import { LlmError, ToolError, SdkError } from "@vinhnt-sdk/provider-spec";

try {
  await kernel.run({ prompt: "Hello" });
} catch (e) {
  if (LlmError.isInstance(e)) {
    console.error(`LLM error [${e.code}]: ${e.message}`);
    if (e.isRetryable) { /* retry logic */ }
  } else if (ToolError.isInstance(e)) {
    console.error(`Tool error: ${e.details?.toolName}`);
  }
}
```

## Security

- Prompt injection protection (unicode bidi, zero-width, XML tags)
- API key redaction in logs (OpenAI, Anthropic, GitHub, AWS)
- Plugin integrity verification (SHA-256 hash, allowlist)
- Process sandboxing with env sanitization

## Documentation

- [Architecture Guide](docs/architecture.md)
- [Package Reference](docs/packages/)
- [API Documentation](docs/api/)
- [Examples](docs/examples/)
- [Migration Guide](docs/migration.md)

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
