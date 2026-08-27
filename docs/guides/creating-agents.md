---
title: "Creating Agents"
description: "Define and configure agents"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 5
sidebarLabel: "Creating Agents"
tags: [agents, create-agent, config]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Creating Agents

Agents are configured LLM instances with tools and instructions. Here's how to create them.

## Basic Agent

```typescript
import { createAgent, AgentKernel } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";

const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: "gpt-4o-mini",
});

// Create agent config
const coderAgent = createAgent({
  id: "coder",
  name: "Coder Agent",
  model: "gpt-4o-mini",
  systemPrompt: "You are a helpful coding assistant. Write clean, readable code.",
});

// Use with kernel
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
});

await kernel.useAgent("coder");
```

## Agent with System Prompt

```typescript
const reviewerAgent = createAgent({
  id: "reviewer",
  name: "Code Reviewer",
  model: "gpt-4o",
  systemPrompt: `You are a senior code reviewer.
  
Rules:
- Focus on correctness, not style
- Suggest improvements with examples
- Be concise but thorough
- Always explain why something should change`,
});
```

## Agent with Permissions

```typescript
const safeAgent = createAgent({
  id: "safe-agent",
  name: "Safe Agent",
  model: "gpt-4o-mini",
  systemPrompt: "You are a careful assistant.",
  permissions: {
    // Only allow read operations
    permissionRiskDefaults: {
      read: "allow",
      write: "deny",
      destructive: "deny",
    },
  },
});
```

## Register Multiple Agents

```typescript
import { InMemoryAgentRegistry } from "@vinhnt-sdk/core";

const registry = new InMemoryAgentRegistry();

// Register agents
registry.register({
  id: "coder",
  name: "Coder",
  systemPrompt: "You write code.",
});

registry.register({
  id: "reviewer",
  name: "Reviewer",
  systemPrompt: "You review code.",
});

registry.register({
  id: "planner",
  name: "Planner",
  systemPrompt: "You plan tasks.",
});

// Use with kernel
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  agentRegistry: registry,
});

// Switch between agents
await kernel.useAgent("coder");
const handle = kernel.run("Write a hello world", ctx);

// Or spawn sub-agents
await kernel.runAgent("reviewer", "Review this code", ctx);
```

## Agent with Model Override

```typescript
const smartAgent = createAgent({
  id: "smart",
  name: "Smart Agent",
  model: "gpt-4o",  // Use more powerful model
  systemPrompt: "You are a highly capable assistant.",
});

const fastAgent = createAgent({
  id: "fast",
  name: "Fast Agent",
  model: "gpt-4o-mini",  // Use faster model
  systemPrompt: "You are a quick assistant.",
});
```

## Agent with Custom Instructions

```typescript
const domainAgent = createAgent({
  id: "api-designer",
  name: "API Designer",
  model: "gpt-4o",
  systemPrompt: `You are an API design expert.

Guidelines:
- Use RESTful conventions
- Version your APIs (v1, v2)
- Include error responses
- Document with OpenAPI specs
- Follow HTTP status code standards`,
});
```

## Using Agent in Express

```typescript
import express from "express";
import { AgentKernel, createAgent } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";

const app = express();
app.use(express.json());

const agent = createAgent({
  id: "assistant",
  name: "Assistant",
  systemPrompt: "You are a helpful assistant.",
});

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
});

app.post("/chat", async (req, res) => {
  const { prompt, agentId } = req.body;

  if (agentId) {
    await kernel.useAgent(agentId);
  }

  const handle = kernel.run(prompt, {
    requestId: `req-${Date.now()}`,
    traceId: `trace-${Date.now()}`,
    actorId: "user",
    tenantId: "default",
  });

  await handle.completed;
  res.json({ success: true });
});
```

## Next Steps

- [Agent Hierarchy](/guides/agent-hierarchy) — Sub-agents and delegation
- [Creating Tools](/guides/creating-tools) — Build tools for agents
- [Tool Permissions](/guides/tool-permissions) — Control tool access
