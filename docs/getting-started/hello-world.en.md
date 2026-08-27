---
title: "Hello World"
description: "Build your first AI agent in 5 minutes"
lang: "en"
type: "guide"
category: "Getting Started"
sidebarPosition: 2
sidebarLabel: "Hello World"
tags: [quickstart, core, tools]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Hello World

Build a working AI agent in **5 minutes**. Copy, paste, run.

## What You'll Build

A simple agent that:
1. Receives a prompt from you
2. Calls an LLM to generate a response
3. Uses a custom tool to do something

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- An API key from [OpenAI](https://platform.openai.com/api-keys), [DeepSeek](https://platform.deepseek.com/), or any OpenAI-compatible provider

## Step 1: Create Project

```bash
mkdir my-agent && cd my-agent
pnpm init
pnpm add @vinhnt-sdk/core @vinhnt-sdk/schema zod
pnpm add -D typescript @types/node
```

## Step 2: Create `tsconfig.json`

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

## Step 3: Create `src/index.ts`

```typescript
import { AgentKernel, defineTool } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";
import { z } from "zod";

// 1. Define a tool
const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform arithmetic calculations",
  risk: "read",
  input: z.object({
    expression: z.string().describe("Math expression like '2 + 3'"),
  }),
  async execute(input) {
    const parts = input.expression.match(/^(\d+)\s*([+\-*/])\s*(\d+)$/);
    if (!parts) {
      throw new Error("Invalid format. Use: number operator number (e.g. '2 + 3')");
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
});

// 2. Create a model provider
const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: "gpt-4o-mini",
});

// 3. Create the kernel
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [calculatorTool.toDefinition()],
  maxSteps: 10,
});

// 4. Run the agent
async function main() {
  console.log("Agent is running...");

  const handle = kernel.run(
    "Calculate 15 * 7 + 3",
    {
      requestId: "req-1",
      traceId: "trace-1",
      actorId: "user",
      tenantId: "default",
    }
  );

  await handle.completed;
  console.log("Done!");
}

main().catch(console.error);
```

## Step 4: Set API Key

```bash
# Linux/Mac
export OPENAI_API_KEY="sk-your-key-here"

# Windows PowerShell
$env:OPENAI_API_KEY="sk-your-key-here"
```

## Step 5: Run

```bash
npx tsx src/index.ts
```

**Expected output:**
```
Agent is running...
Done!
```

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Your Prompt │────▶│  AgentKernel │────▶│  LLM (GPT)  │
└─────────────┘     │              │     └─────────────┘
                    │  ┌─────────┐ │
                    │  │  Tools  │ │◀── calculatorTool
                    │  └─────────┘ │
                    └──────────────┘
```

1. **`defineTool()`** — Creates a tool with Zod schema for input validation
2. **`OpenAICompatibleProvider`** — Connects to OpenAI API (or any compatible provider)
3. **`AgentKernel`** — Orchestrates the agent loop: prompt → LLM → tool calls → response
4. **`kernel.run()`** — Starts the agent and waits for completion

## Using Other Providers

### DeepSeek

```typescript
const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY!,
  defaultModel: "deepseek-chat",
});
```

### Ollama (Local)

```typescript
const model = new OpenAICompatibleProvider({
  baseUrl: "http://localhost:11434/v1",
  defaultModel: "llama3",
});
```

## Adding More Tools

```typescript
import { defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

const weatherTool = defineTool({
  name: "get_weather",
  description: "Get current weather for a city",
  risk: "read",
  input: z.object({
    city: z.string().describe("City name"),
  }),
  async execute(input) {
    // In real app, call a weather API
    return { temperature: 25, condition: "sunny", city: input.city };
  },
});

// Add to kernel
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  tools: [
    calculatorTool.toDefinition(),
    weatherTool.toDefinition(),
  ],
  maxSteps: 10,
});
```

## Next Steps

- [Installation](/getting-started/installation) — Full installation guide
- [Configuration](/getting-started/configuration) — Environment, credentials, settings
- [Creating Tools](/guides/creating-tools) — Build custom tools
- [Express Integration](/frameworks/express) — Use in Express.js apps
- [NestJS Integration](/frameworks/nestjs) — Use in NestJS apps
