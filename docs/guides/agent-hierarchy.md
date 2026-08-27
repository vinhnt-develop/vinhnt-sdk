---
title: "Agent Hierarchy"
description: "Sub-agents and delegation"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 6
sidebarLabel: "Agent Hierarchy"
tags: [agents, sub-agents, delegation]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Agent Hierarchy

Use sub-agents to break complex tasks into smaller pieces.

## Basic Sub-Agent

```typescript
import { AgentKernel, createAgent, InMemoryAgentRegistry } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";

const registry = new InMemoryAgentRegistry();

// Register specialist agents
registry.register({
  id: "researcher",
  name: "Researcher",
  systemPrompt: "You research topics and gather information.",
});

registry.register({
  id: "writer",
  name: "Writer",
  systemPrompt: "You write clear, concise content.",
});

registry.register({
  id: "reviewer",
  name: "Reviewer",
  systemPrompt: "You review work for errors and improvements.",
});

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  agentRegistry: registry,
  maxSubAgentDepth: 3,  // Limit nesting depth
});
```

## Spawn Sub-Agent

```typescript
// Main agent spawns a sub-agent
const result = await kernel.runAgent(
  "researcher",
  "Research the latest Node.js features",
  {
    requestId: "req-1",
    traceId: "trace-1",
    actorId: "user",
    tenantId: "default",
  }
);

console.log(result); // Sub-agent's output
```

## Parallel Sub-Agents

Run multiple sub-agents simultaneously:

```typescript
const results = await kernel.runAgentsParallel(
  [
    { agentId: "researcher", prompt: "Research React 19" },
    { agentId: "researcher", prompt: "Research Vue 3.4" },
    { agentId: "researcher", prompt: "Research Svelte 5" },
  ],
  {
    requestId: "req-1",
    traceId: "trace-1",
    actorId: "user",
    tenantId: "default",
  }
);

// results is an array of outputs
```

## Agent Delegation Pattern

Main agent delegates to specialists:

```typescript
const coordinatorAgent = createAgent({
  id: "coordinator",
  name: "Coordinator",
  systemPrompt: `You coordinate tasks between specialist agents.

Available agents:
- researcher: Gathers information
- writer: Creates content
- reviewer: Reviews and improves

Delegate tasks to the appropriate agent.`,
});

const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  agentRegistry: registry,
});

// Coordinator delegates to specialists
await kernel.useAgent("coordinator");
const handle = kernel.run(
  "Write a blog post about TypeScript 5.4",
  ctx
);

await handle.completed;
```

## Limiting Sub-Agent Depth

Prevent infinite nesting:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  agentRegistry: registry,
  maxSubAgentDepth: 2,  // Max 2 levels of sub-agents
});
```

## Complete Example: Multi-Agent Workflow

```typescript
import { AgentKernel, createAgent, InMemoryAgentRegistry } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";

const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: "gpt-4o-mini",
});

const registry = new InMemoryAgentRegistry();

// Define agents
registry.register({
  id: "planner",
  name: "Planner",
  systemPrompt: "You break tasks into steps.",
});

registry.register({
  id: "coder",
  name: "Coder",
  systemPrompt: "You write code.",
});

registry.register({
  id: "tester",
  name: "Tester",
  systemPrompt: "You write tests.",
});

// Create kernel
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  agentRegistry: registry,
  maxSteps: 30,
  maxSubAgentDepth: 2,
});

// Run workflow
async function workflow(task: string) {
  // Planner creates a plan
  await kernel.useAgent("planner");
  const planHandle = kernel.run(`Break down this task: ${task}`, ctx);
  await planHandle.completed;

  // Coder implements
  await kernel.useAgent("coder");
  const codeHandle = kernel.run("Implement the plan", ctx);
  await codeHandle.completed;

  // Tester tests
  await kernel.useAgent("tester");
  const testHandle = kernel.run("Write tests for the implementation", ctx);
  await testHandle.completed;
}

workflow("Build a REST API for user management");
```

## Next Steps

- [Creating Agents](/guides/creating-agents) — Define agent configs
- [Creating Tools](/guides/creating-tools) — Build tools for agents
- [Plugin Hooks](/guides/plugin-hooks) — Monitor agent activity
