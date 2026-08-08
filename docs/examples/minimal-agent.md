# Example: Minimal Agent

> The simplest possible agent setup with one custom tool.

---

## Flow

```mermaid
sequenceDiagram
    participant U as You
    participant A as Agent
    participant M as OpenAI
    participant T as Calculator

    U->>A: "What is 42 * 17?"
    A->>M: Send prompt + tools
    M->>A: Call calculator(42, 17, multiply)
    A->>T: Execute: 42 * 17
    T->>A: { result: 714 }
    A->>M: Tool result: 714
    M->>A: "42 * 17 = 714"
    A->>U: "42 * 17 = 714"
```

## package.json

```json
{
  "name": "minimal-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx agent.ts"
  },
  "dependencies": {
    "@vinhnt-sdk/core": "^0.1.0",
    "@vinhnt-sdk/schema": "^0.1.0",
    "@vinhnt-sdk/adapters": "^0.1.0",
    "ai": "^4.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.5.0"
  }
}
```

## agent.ts

```typescript
import { AgentKernel, NullRunEventStore, defineTool } from "@vinhnt-sdk/core";
import { createModelProvider } from "@vinhnt-sdk/adapters";
import { z } from "zod";

// 1. Define a tool
const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform basic arithmetic. Use this for math questions.",
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

// 2. Create model provider
const model = createModelProvider("openai", "gpt-4o", {
  apiKey: process.env.OPENAI_API_KEY!,
});

// 3. Create kernel
const kernel = new AgentKernel({
  model,
  tools: [calculatorTool],
  store: new NullRunEventStore(),
});

// 4. Run
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

## Run

```bash
OPENAI_API_KEY=sk-... npx tsx agent.ts "What is 42 * 17?"
```
