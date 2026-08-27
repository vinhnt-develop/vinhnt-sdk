---
title: "Multi-Model"
description: "Route between multiple LLM providers and models with fallback strategies"
lang: "en"
type: "example"
category: "Examples"
sidebarPosition: 4
---

# Multi-Model Routing

Configure multiple providers, route requests based on task type, and implement fallback strategies for cost optimization and reliability.

## Overview

This example demonstrates how to:

- Register multiple LLM providers (DeepSeek, OpenAI, Ollama)
- Route requests to the best model based on task type
- Implement fallback strategies when a provider is unavailable
- Optimize costs by selecting appropriate models

## Setup

```bash
npm install vinhnt-sdk
```

## Basic Multi-Provider Setup

```typescript
import { LLMRouter, ModelProvider, TaskType } from "vinhnt-sdk";

const router = new LLMRouter();

router.register({
  name: "deepseek",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat", "deepseek-coder"],
  apiKey: process.env.DEEPSEEK_API_KEY,
  priority: 1,
  costPer1kTokens: 0.00014,
});

router.register({
  name: "openai",
  provider: ModelProvider.OPENAI,
  models: ["gpt-4o", "gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY,
  priority: 2,
  costPer1kTokens: 0.005,
});

router.register({
  name: "ollama",
  provider: ModelProvider.OLLAMA,
  models: ["llama3.1", "codellama"],
  baseUrl: "http://localhost:11434",
  priority: 3,
  costPer1kTokens: 0,
});

const llm = router.build();
```

## Task-Based Routing

```typescript
const taskRouter = new LLMRouter();

taskRouter.route(TaskType.CODE_GENERATION, {
  preferred: ["deepseek-coder", "codellama"],
  fallback: ["gpt-4o"],
});

taskRouter.route(TaskType.REASONING, {
  preferred: ["deepseek-chat", "gpt-4o"],
  fallback: ["llama3.1"],
});

taskRouter.route(TaskType.GENERAL, {
  preferred: ["gpt-4o-mini", "deepseek-chat"],
  fallback: ["llama3.1"],
});

const llm = taskRouter.build();

const codeResult = await llm.generate({
  task: TaskType.CODE_GENERATION,
  prompt: "Write a binary search function in TypeScript",
});
```

## Fallback Strategy

```typescript
const resilientRouter = new LLMRouter({
  fallbackStrategy: "sequential",
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
});

resilientRouter.register({
  name: "primary",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY,
});

resilientRouter.register({
  name: "secondary",
  provider: ModelProvider.OPENAI,
  models: ["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY,
});

resilientRouter.register({
  name: "tertiary",
  provider: ModelProvider.OLLAMA,
  models: ["llama3.1"],
  baseUrl: "http://localhost:11434",
});

const llm = resilientRouter.build();

const result = await llm.generate({
  prompt: "Summarize this document",
});
```

## Cost Optimization

```typescript
const costRouter = new LLMRouter({
  costOptimization: true,
  maxCostPerRequest: 0.01,
  budget: { daily: 5.0, monthly: 100.0 },
});

costRouter.register({
  name: "budget",
  provider: ModelProvider.OLLAMA,
  models: ["llama3.1"],
  costPer1kTokens: 0,
});

costRouter.register({
  name: "mid-range",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  costPer1kTokens: 0.00014,
});

costRouter.register({
  name: "premium",
  provider: ModelProvider.OPENAI,
  models: ["gpt-4o"],
  costPer1kTokens: 0.005,
});

const llm = costRouter.build();

const result = await llm.generate({
  prompt: "What is the capital of France?",
  requirements: { maxTokens: 100, quality: "standard" },
});
```

## Load Balancing

```typescript
const loadBalancer = new LLMRouter({
  loadBalancing: true,
  strategy: "round-robin",
});

loadBalancer.register({
  name: "deepseek-1",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY_1,
});

loadBalancer.register({
  name: "deepseek-2",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY_2,
});

const llm = loadBalancer.build();

for (let i = 0; i < 10; i++) {
  await llm.generate({ prompt: `Request ${i}` });
}
```

## Health Monitoring

```typescript
const monitoredRouter = new LLMRouter({
  healthCheck: true,
  healthCheckInterval: 60000,
  onProviderDown: (provider) => {
    console.warn(`Provider ${provider.name} is down`);
  },
  onProviderUp: (provider) => {
    console.log(`Provider ${provider.name} is back up`);
  },
});

monitoredRouter.register({
  name: "deepseek",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const llm = monitoredRouter.build();
```

## Error Handling

```typescript
const safeRouter = new LLMRouter({
  fallbackStrategy: "sequential",
  maxRetries: 3,
});

safeRouter.register({
  name: "primary",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY,
});

safeRouter.register({
  name: "fallback",
  provider: ModelProvider.OPENAI,
  models: ["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY,
});

const llm = safeRouter.build();

try {
  const result = await llm.generate({ prompt: "Explain quantum computing" });
  console.log(result.text);
} catch (error) {
  if (error.code === "ALL_PROVIDERS_FAILED") {
    console.error("All providers are unavailable");
  } else if (error.code === "RATE_LIMITED") {
    console.error("Rate limited by all providers");
  } else if (error.code === "TIMEOUT") {
    console.error("All providers timed out");
  }
}
```

## Streaming with Fallback

```typescript
const streamingRouter = new LLMRouter({
  fallbackStrategy: "sequential",
});

streamingRouter.register({
  name: "primary",
  provider: ModelProvider.DEEPSEEK,
  models: ["deepseek-chat"],
  apiKey: process.env.DEEPSEEK_API_KEY,
});

streamingRouter.register({
  name: "fallback",
  provider: ModelProvider.OPENAI,
  models: ["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY,
});

const llm = streamingRouter.build();

const stream = await llm.stream({
  prompt: "Write a story about a robot",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}
```

## Environment Variables

```env
DEEPSEEK_API_KEY=your-deepseek-api-key
OPENAI_API_KEY=your-openai-api-key
```

## Summary

Multi-model routing provides:

- **Flexibility**: Use the best model for each task
- **Reliability**: Automatic fallback on provider failure
- **Cost Optimization**: Select the cheapest model that meets requirements
- **Load Balancing**: Distribute requests across providers
- **Health Monitoring**: Track provider availability
