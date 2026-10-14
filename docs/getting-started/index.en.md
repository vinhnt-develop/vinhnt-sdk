---
title: Getting Started
description: Start building AI agents in minutes
lang: en
type: guide
category: Getting Started
sidebarPosition: 1
---

# Getting Started

Welcome to vinhnt-sdk! This guide will help you set up your environment and build your first AI agent in just a few minutes.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 20+** - The runtime for executing TypeScript
- **TypeScript 5.0+** - For type-safe development
- **Package Manager** - pnpm (recommended), npm, or yarn
- **AI Model API Key** - OpenAI, Anthropic, or other supported provider

## 3-Step Quickstart

### Step 1: Install

Add the core packages to your project:

```bash
pnpm add @vinhnt-sdk/core @vinhnt-sdk/tools @vinhnt-sdk/session @vinhnt-sdk/provider-openai-compatible zod
```

### Step 2: Configure

Create a basic configuration file:

```typescript
// agent.config.ts
export default {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
}
```

### Step 3: Run

Create and run your first agent:

```typescript
import { AgentKernel, defineTool } from '@vinhnt-sdk/core'
import { NullRunEventStore } from '@vinhnt-sdk/session'
import { OpenAICompatibleProvider } from '@vinhnt-sdk/provider-openai-compatible'
import { z } from 'zod'

const calculator = defineTool({
  name: 'calculator',
  description: 'Perform basic calculations',
  risk: 'read',
  input: z.object({ expression: z.string().describe('Math expression') }),
  async execute({ expression }) {
    return eval(expression)
  },
})

const kernel = new AgentKernel({
  model: new OpenAICompatibleProvider({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY!,
    defaultModel: 'gpt-4o-mini',
  }),
  store: new NullRunEventStore(),
  tools: [calculator.toDefinition()],
})

const handle = kernel.run('What is 2 + 2?', {
  requestId: 'req-1',
  traceId: 'trace-1',
  actorId: 'user-1',
  tenantId: 'default',
})
await handle.completed
```

## What You'll Build

In this getting started guide, you'll build a simple calculator agent that can:

- Accept natural language math questions
- Parse and evaluate mathematical expressions
- Return formatted results
- Handle errors gracefully

This example demonstrates the core concepts of vinhnt-sdk:

1. **Tools** - Define what your agent can do
2. **Kernel** - The runtime that orchestrates everything
3. **Execution** - Running agent tasks and getting results

## Next Steps

Once you've completed this overview, continue to:

- [Installation](/docs/getting-started/installation) - Detailed installation options
- [Quickstart Tutorial](/docs/getting-started/quickstart) - Build a complete agent
- [Authentication](/docs/getting-started/authentication) - Set up API keys securely
- [Configuration](/docs/getting-started/configuration) - Advanced configuration options

## Need Help?

Check the [Troubleshooting Guide](/docs/troubleshooting) or join our [Discord Community](https://discord.gg/vinhnt-sdk).