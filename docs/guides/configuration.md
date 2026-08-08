# Configuration

> How to configure vinhnt-sdk projects.

---

## Overview

vinhnt-sdk is a library, not an application. It accepts configuration via constructor parameters, not config files. Your application is responsible for loading configuration from files, environment variables, or other sources.

## Configuring the Kernel

```typescript
import { AgentKernel, NullRunEventStore } from "@vinhnt-sdk/core";

const kernel = new AgentKernel({
  model: yourModelProvider,
  tools: [yourTools],
  store: new NullRunEventStore(),
  maxSteps: 50,
  systemPrompt: "You are a helpful coding assistant.",
});
```

## Environment Variables

Your application can load environment variables and pass them to the kernel:

```typescript
const apiKey = process.env.OPENAI_API_KEY;

const model = {
  id: "openai-gpt4o",
  provider: "openai",
  model: "gpt-4o",
  capabilities: { streaming: true, toolCalling: true, vision: false },
  async *stream(request) {
    // Use apiKey here
  },
};
```

## Custom Configuration

You can define your own config schema and load it however you want:

```typescript
import { readFileSync } from "fs";

// Your own config type
interface AppConfig {
  provider: {
    type: string;
    model: string;
    apiKey: string;
  };
  agent: {
    maxSteps: number;
    systemPrompt: string;
  };
}

// Load config from file
const rawConfig = readFileSync("./config.json", "utf-8");
const config: AppConfig = JSON.parse(rawConfig);

// Use config to create kernel
const kernel = new AgentKernel({
  model: createModel(config.provider),
  maxSteps: config.agent.maxSteps,
});
```

## Configuration Precedence

Your application decides how to handle configuration precedence. Common patterns:

1. **CLI arguments** — Override with `--model gpt-4o`
2. **Environment variables** — `OPENAI_API_KEY=sk-...`
3. **Config file** — `config.json`
4. **Defaults** — Built-in defaults

## Type-Safe Configuration

Use Zod for runtime validation:

```typescript
import { z } from "zod";

const ConfigSchema = z.object({
  provider: z.object({
    type: z.enum(["openai", "anthropic"]),
    model: z.string(),
    apiKey: z.string(),
  }),
  agent: z.object({
    maxSteps: z.number().default(50),
    systemPrompt: z.string().optional(),
  }),
});

const config = ConfigSchema.parse(rawConfig);
```
