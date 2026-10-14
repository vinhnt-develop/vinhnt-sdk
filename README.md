# vinhnt-sdk

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9-orange)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org)

> AI Agent SDK — modular TypeScript libraries for building AI coding agents.

## Packages (22 packages)

### Core Layer (Required)

| Package | Description |
|---------|-------------|
| `@vinhnt-sdk/schema` | Types, contracts, branded IDs, wire format |
| `@vinhnt-sdk/config` | Credential resolution, settings, env validation |
| `@vinhnt-sdk/llm` | LLM adapter, registry, token metering |
| `@vinhnt-sdk/tools` | Tool framework + built-in tools (fs, shell, git, web, search) |
| `@vinhnt-sdk/sandbox` | Process isolation with host/process/container backends |
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
| `@vinhnt-sdk/security` | Secret redactor, injection detection (deprecated → use guard) |
| `@vinhnt-sdk/lsp` | Language Server Protocol integration |
| `@vinhnt-sdk/guardrails` | Guardrail tripwires for inputs/outputs |
| `@vinhnt-sdk/workflow` | Workflow primitives (parallel, sequential, conditional) |
| `@vinhnt-sdk/test-utils` | Shared test utilities and mocks |
| `@vinhnt-sdk/tools-browser` | Browser/computer-use + image-gen tools (driver-injected) |

## Key Features (8-Phase Refactor)

- **Structured Error Taxonomy** — Stable `code` + `domain`/`category` + `retryable` for programmatic handling (`SdkError`, `isSdkError`, `hasErrorCode`, `errorChain` in `@vinhnt-sdk/schema`)
- **ToolMiddleware** — Extensible tool execution hooks for logging, validation, and transformation
- **TelemetryProvider** — Pluggable observability interface for cost tracking and tracing
- **Test Utilities** — Shared mocks for `RunUsage`, `ChatMessage`, and test helpers

## Quick Start

```bash
pnpm add @vinhnt-sdk/core @vinhnt-sdk/tools @vinhnt-sdk/session @vinhnt-sdk/provider-openai-compatible zod
```

```typescript
import { AgentKernel, defineTool } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";
import { z } from "zod";

// Schema-first tool: owns its validation schema, derives its JSON Schema
const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform arithmetic calculations",
  risk: "read",
  input: z.object({
    expression: z.string().describe("Arithmetic expression, e.g. '2 + 2'"),
  }),
  async execute({ expression }) {
    const parts = expression.match(/^(\d+)\s*([+\-*/])\s*(\d+)$/);
    if (!parts) throw new Error("Invalid expression. Use: number operator number");
    const [, a, op, b] = parts;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    switch (op) {
      case "+": return numA + numB;
      case "-": return numA - numB;
      case "*": return numA * numB;
      case "/":
        if (numB === 0) throw new Error("Division by zero");
        return numA / numB;
      default: throw new Error(`Unknown operator: ${op}`);
    }
  },
});

const kernel = new AgentKernel({
  model: new OpenAICompatibleProvider({
    baseUrl: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY!,
    defaultModel: "gpt-4o-mini",
  }),
  store: new NullRunEventStore(),
  tools: [calculatorTool.toDefinition()],
  maxSteps: 10,
});

const handle = kernel.run("Calculate 2 + 2", {
  requestId: "req-1",
  traceId: "trace-1",
  actorId: "user-1",
  tenantId: "default",
});
const result = await handle.completed;
console.log("Agent completed:", result);
```

## Error Handling

```typescript
import { SdkError, hasErrorCode, errorChain } from "@vinhnt-sdk/schema";

try {
  const handle = kernel.run("Hello", {
    requestId: "req-2",
    traceId: "trace-2",
    actorId: "user-1",
    tenantId: "default",
  });
  const result = await handle.completed;
} catch (e) {
  if (SdkError.isInstance(e)) {
    console.error(`[${e.domain ?? "unknown"}] ${e.code}: ${e.message}`);
    if (e.retryable) { /* retry logic */ }
  } else if (hasErrorCode(e, "TOOL_PERMISSION_DENIED")) {
    console.error("Tool permission denied:", errorChain(e));
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
