---
title: Quickstart
description: Build a working agent in 5 minutes
lang: en
type: guide
category: Getting Started
sidebarPosition: 3
---

# Quickstart
Build a working agent with vinhnt-sdk in 5 minutes.

## Prerequisites

- **Node.js** 20+
- **pnpm** (recommended) or npm/yarn
- **TypeScript** 5.0+
- An LLM API key (DeepSeek, OpenAI, or Anthropic)

## Step 1: Create the project

```bash
mkdir my-agent && cd my-agent
pnpm init
pnpm add @vinhnt-sdk/schema @vinhnt-sdk/core @vinhnt-sdk/tools \
  @vinhnt-sdk/session @vinhnt-sdk/provider-openai-compatible
pnpm add -D typescript @types/node
```

Create `tsconfig.json`:

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

Set your API key:

```bash
export DEEPSEEK_API_KEY=sk-...
```

## Step 2: Create a tool

Tools are the building blocks. Each tool has a name, description, risk level, input schema, and an execute function.

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

### Risk levels

| Risk | Description |
|------|-------------|
| `read` | Read-only, no side effects |
| `write` | Modifies state (files, data) |
| `destructive` | Irreversible changes (delete, overwrite) |
| `external` | Calls external services |

## Step 3: Create the kernel

The `AgentKernel` orchestrates LLM calls, tool execution, and permissions.

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

## Step 4: Run the agent

### Simple run

```typescript
// src/main.ts
import { kernel } from "./kernel.js";
const ctx = {
  requestId: "req-1",
  traceId: "trace-1",
  actorId: "user-1",
  tenantId: "default",
};
const handle = kernel.run("What is 42 * 37? Use the calculator tool.", ctx);
await handle.completed;
console.log("Run completed:", handle.runId);
```

### Event streaming

```typescript
// src/stream.ts
import { kernel } from "./kernel.js";
const ctx = {
  requestId: "req-2",
  traceId: "trace-2",
  actorId: "user-1",
  tenantId: "default",
};

const handle = kernel.createRunHandle(
  "Calculate (15 + 27) then multiply by 3",
  ctx,
);

for await (const event of handle.events()) {
  switch (event.type) {
    case "agent.started":   console.log("Agent started"); break;
    case "agent.completed": console.log(`Completed: ${event.status}`); break;
    case "agent.error":     console.log(`Error: ${event.error}`); break;
  }
}

const result = await handle.completed;
console.log("Status:", result.status);
```

## Complete working example
Full `src/index.ts`:

```typescript
import { AgentKernel } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { createDeepSeekProvider } from "@vinhnt-sdk/provider-openai-compatible";
import { defineTool } from "@vinhnt-sdk/tools";
import { z } from "zod";
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
const ctx = {
  requestId: "quickstart",
  traceId: "trace-1",
  actorId: "user-1",
  tenantId: "default",
};
const handle = kernel.run("What is 42 * 37?", ctx);
await handle.completed;
console.log("Done! Run ID:", handle.runId);
```

```bash
npx tsx src/index.ts
```
## Next steps
- [Tools Guide](/docs/guides/tools) — Built-in tools and custom tool patterns
- [Permissions](/docs/guides/permissions) — Configure tool approval gates
- [Session Management](/docs/guides/sessions) — Persist conversation state
- [Plugins](/docs/guides/plugins) — Extend the kernel with hooks
- [Sub-Agents](/docs/guides/sub-agents) — Delegate tasks to specialized agents
