# Quick Start

> Get a working agent in under 5 minutes.

---

## Prerequisites

- Node.js 20+
- npm, pnpm, or yarn
- An API key from an AI provider (OpenAI, Anthropic, etc.)

## Flow

```mermaid
sequenceDiagram
    participant U as You
    participant A as Agent
    participant M as AI Model
    participant T as Tools

    U->>A: "What is 42 * 17?"
    A->>M: Send prompt + tool definitions
    M->>A: Call calculator tool
    A->>T: Execute: 42 * 17
    T->>A: Result: 714
    A->>M: Send tool result
    M->>A: "42 * 17 = 714"
    A->>U: "42 * 17 = 714"
```

## 1. Install Dependencies

```bash
# Core packages (minimum)
npm install @vinhnt-sdk/core @vinhnt-sdk/schema

# Dev tools
npm install -D tsx typescript
```

## 2. Create Your First Agent

```typescript
// agent.ts
import { AgentKernel, NullRunEventStore, defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

// Step 1: Define a tool
const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform basic arithmetic",
  risk: "low",
  input: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  execute: async (input) => {
    const results = {
      add: input.a + input.b,
      subtract: input.a - input.b,
      multiply: input.a * input.b,
      divide: input.a / input.b,
    };
    return { result: results[input.operation] };
  },
});

// Step 2: Create model provider (implement ModelProvider interface)
const model = {
  id: "openai-gpt4o",
  provider: "openai",
  model: "gpt-4o",
  capabilities: { streaming: true, toolCalling: true, vision: false },
  async *stream(request) {
    // Implement with your preferred AI SDK
    // Example using Vercel AI SDK:
    // import { streamText } from "ai";
    // import { openai } from "@ai-sdk/openai";
    // const result = streamText({ model: openai("gpt-4o"), messages: request.messages });
    // yield* result.textStream;
  },
};

// Step 3: Create kernel
const kernel = new AgentKernel({
  model,
  tools: [calculatorTool],
  store: new NullRunEventStore(),
});

// Step 4: Run
async function main() {
  const prompt = process.argv[2] || "What is 42 * 17?";
  console.log(`Prompt: ${prompt}\n`);

  const handle = kernel.run(prompt);

  for await (const event of handle.events) {
    if (event.type === "tool.invoked") {
      console.log(`  Tool: ${event.data.toolName}`);
    }
    if (event.type === "tool.completed") {
      console.log(`  Result: ${JSON.stringify(event.data.result)}`);
    }
  }

  const result = await handle.completed;
  console.log(`\nAnswer: ${result}`);
}

main();
```

## 3. Run It

```bash
npx tsx agent.ts "What is 42 * 17?"
```

## Expected Output

```
Prompt: What is 42 * 17?

  Tool: calculator
  Result: {"result":714}

Answer: 42 * 17 = 714
```

---

## Next Steps

- [Installation Guide](./installation.md) — Detailed setup options
- [Creating Tools](./creating-tools.md) — Advanced tool patterns
- [Architecture](./architecture.md) — How the system fits together
