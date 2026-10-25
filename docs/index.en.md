---
title: vinhnt-sdk
description: AI Agent SDK for TypeScript
lang: en
type: concept
category: Getting Started
---

# Build AI agents with TypeScript

vinhnt-sdk is a modular, extensible SDK for building AI agents in TypeScript. It provides 23 packages that work together to give you a complete toolkit for creating, deploying, and managing intelligent agents.

## What is vinhnt-sdk?

vinhnt-sdk is designed from the ground up for TypeScript developers. It offers a type-safe, composable architecture that scales from simple prototypes to production deployments. Whether you're building a chatbot, an automation agent, or a complex multi-agent system, vinhnt-sdk provides the building blocks you need.

### Key Features

- **Tool System** - Define and manage tools with type-safe schemas and validation
- **Plugin Architecture** - Extend functionality through a powerful plugin system
- **Event-driven** - React to agent lifecycle events and custom events
- **Security-first** - Built-in permission system with risk-level classifications
- **Observable** - Comprehensive logging, metrics, and tracing capabilities

## Quick Install

```bash
pnpm add @vinhnt-sdk/core @vinhnt-sdk/tools @vinhnt-sdk/session @vinhnt-sdk/provider-openai-compatible zod
```

## 5-Minute Example

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

const handle = kernel.run('Calculate 15 * 23', {
  requestId: 'req-1',
  traceId: 'trace-1',
  actorId: 'user-1',
  tenantId: 'default',
})
await handle.completed
```

## Next Steps

- [Getting Started](/docs/getting-started) - Set up your development environment
- [Architecture](/docs/architecture) - Understand the SDK's design
- [API Reference](/docs/api) - Explore the complete API
- [Examples](/docs/examples) - See real-world usage patterns

## Community

Join our growing community of developers building the next generation of AI agents. Report issues, request features, and share your projects on GitHub.