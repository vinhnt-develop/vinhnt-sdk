# @vinhnt-sdk/core

> Version: 0.6.1 | Status: STABLE

Core agent engine for vinhnt-sdk — kernel, orchestration, streaming, event bus, and workflows.

## Install

```bash
# npm
npm install @vinhnt-sdk/core

# pnpm (monorepo)
pnpm add @vinhnt-sdk/core
```

## Features

- **AgentKernel** — Main orchestration engine with configurable steps, retries, and circuit breaker
- **RunUsage** — Nested usage metrics (tokens, cost, duration, tool calls)
- **AgentRunHandle** — Lifecycle management with cancel, events streaming, and completion tracking
- **Agent-as-Tool** — Delegate work to sub-agents via tool interface
- **Workflow** — Parallel, sequential, and conditional step execution
- **Guardrails** — Input/output safety tripwires
- **Guard System** — Monotonic guard decisions for tool execution

## Quick Start

```typescript
import { AgentKernel, InMemoryEventBus } from "@vinhnt-sdk/core";
import { defineTool } from "@vinhnt-sdk/tools";
import { z } from "zod";

const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform arithmetic calculations",
  risk: "read",
  input: z.object({
    expression: z.string(),
  }),
  async execute(input) {
    const parts = input.expression.match(/^(\d+)\s*([+\-*/])\s*(\d+)$/);
    if (!parts) throw new Error("Invalid expression");
    const [, a, op, b] = parts;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    switch (op) {
      case "+": return { result: numA + numB };
      case "-": return { result: numA - numB };
      case "*": return { result: numA * numB };
      case "/": return { result: numA / numB };
      default: throw new Error("Unknown operator");
    }
  },
}).toDefinition();

const kernel = new AgentKernel({
  model: yourModelProvider,
  store: new InMemoryEventBus(),
  tools: [calculatorTool],
  maxSteps: 10,
});

const handle = kernel.createRunHandle("Calculate 2 + 2", {
  sessionId: "session-1",
  agentId: "calculator-agent",
});

const result = await handle.completed;
console.log(result.status); // "succeeded"
console.log(result.usage);  // RunUsage with nested metrics
```

## API Reference

### Core Classes

| Export | Description |
|--------|-------------|
| `AgentKernel` | Main kernel for agent orchestration |
| `KernelError` | Error class for kernel failures |
| `InMemoryEventBus` | Typed pub/sub event bus |
| `InMemorySessionState` | Session state management |
| `SessionRunCoordinator` | Run coordination across sessions |
| `InMemoryAgentRegistry` | Agent registry for sub-agents |
| `InMemoryModelRegistry` | Model registry for multi-model routing |
| `InMemoryApprovalStore` | Approval storage for permissions |
| `WorkspaceManager` | Workspace file management |
| `Tracer` | Execution tracing |

### Kernel Methods

| Method | Description |
|--------|-------------|
| `createRunHandle(prompt, ctx)` | Create a run handle with lifecycle management |
| `run(prompt, ctx)` | Start a run (legacy) |
| `streamRun(prompt, ctx)` | Stream run events |
| `reconfigure(config)` | Reconfigure kernel |

### AgentRunHandle

```typescript
const handle = kernel.createRunHandle(prompt, {
  sessionId: "session-123",
  agentId: "my-agent",
});

// Properties
handle.runId;        // Run ID
handle.isRunning;    // Is running
handle.isCompleted;  // Is completed
handle.isCancelled;  // Is cancelled

// Methods
handle.onEvent(handler);  // Subscribe to events
handle.events();          // Async iterable of events
handle.cancel();          // Cancel run

// Await completion
const result = await handle.completed;
```

### AgentRunResult (Nested Usage Pattern)

```typescript
interface AgentRunResult {
  readonly runId: RunId;
  readonly status: "succeeded" | "failed" | "cancelled";
  readonly output?: string;
  readonly error?: string;
  readonly usage?: RunUsage;
}

interface RunUsage {
  readonly totalSteps: number;
  readonly durationMs?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly reasoningTokens?: number;
  readonly cacheReadTokens?: number;
  readonly cacheWriteTokens?: number;
  readonly totalTokens?: number;
  readonly cost?: number;
  readonly toolCallsCount?: number;
  readonly model?: string;
  readonly provider?: string;
  readonly stopReason?: string;
  readonly raw?: Record<string, unknown>;
}
```

### Agent-as-Tool

```typescript
import { agentAsTool, createHandoffTool } from "@vinhnt-sdk/core";

const codeReviewTool = agentAsTool({
  agentId: "code-reviewer",
  description: "Review code for issues",
  kernel,
});

// Use in another agent
const kernel2 = new AgentKernel({
  model: provider,
  store: eventStore,
  tools: [codeReviewTool],
});
```

### Workflow

```typescript
import { parallel, sequential, conditional } from "@vinhnt-sdk/core";

// Sequential execution
const result = await sequential([
  { step: step1 },
  { step: step2 },
  { step: step3 },
], context);

// Parallel execution
const results = await parallel([
  { step: fetchUsers },
  { step: fetchOrders },
  { step: fetchProducts },
], context);

// Conditional execution
const result = await conditional([
  { branch: "if-high-priority", condition: (ctx) => ctx.priority === "high", step: handleHighPriority },
  { branch: "default", step: handleNormal },
], context);
```

### Guardrails

```typescript
import { runGuardrails, maxLengthGuardrail, blocklistGuardrail } from "@vinhnt-sdk/core";

const result = await runGuardrails({
  input: userInput,
  guardrails: [
    maxLengthGuardrail({ maxLength: 10000 }),
    blocklistGuardrail({ patterns: ["password", "secret"] }),
  ],
});

if (result.blocked) {
  console.log("Input blocked:", result.reason);
}
```

## Dependencies

- `@vinhnt-sdk/schema` >=0.5.0
- `@vinhnt-sdk/event` workspace:*
- `@vinhnt-sdk/llm` workspace:*
- `@vinhnt-sdk/permission` workspace:*
- `@vinhnt-sdk/sandbox` workspace:*
- `@vinhnt-sdk/guard` workspace:*
- `@vinhnt-sdk/guardrails` workspace:*
- `@vinhnt-sdk/workflow` workspace:*
- `@vinhnt-sdk/session` workspace:*
- `@vinhnt-sdk/knowledge` workspace:*
- `@vinhnt-sdk/tools` workspace:*
- `@vinhnt-sdk/step-executor` workspace:*
- `zod` ^4.4.3

## Usage Examples

### Basic Agent Run

```typescript
import { AgentKernel, InMemoryEventBus } from "@vinhnt-sdk/core";

const kernel = new AgentKernel({
  model: yourModelProvider,
  store: new InMemoryEventBus(),
});

const handle = kernel.createRunHandle("Write a hello world program", {
  sessionId: "session-1",
  agentId: "coder",
});

const result = await handle.completed;
console.log(result.output);
console.log(result.usage?.totalTokens);
```

### Streaming Events

```typescript
const handle = kernel.createRunHandle("Tell me a story", {
  sessionId: "session-2",
  agentId: "storyteller",
});

for await (const event of handle.events()) {
  switch (event.type) {
    case "agent.started":
      console.log("Started:", event.prompt);
      break;
    case "model.request":
      console.log("Requesting model...");
      break;
    case "model.response":
      console.log("Model responded");
      break;
    case "agent.completed":
      console.log("Completed:", event.status);
      break;
  }
}
```

### Cancel Run

```typescript
const handle = kernel.createRunHandle("Long running task", ctx);

setTimeout(() => handle.cancel(), 5000);

const result = await handle.completed;
if (result.status === "cancelled") {
  console.log("Run was cancelled");
}
```

## License

MIT
