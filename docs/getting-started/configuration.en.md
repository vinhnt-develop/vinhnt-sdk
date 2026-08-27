---
title: "Configuration"
description: "Configure environment, credentials, and kernel settings"
lang: "en"
type: "reference"
category: "Getting Started"
sidebarPosition: 3
sidebarLabel: "Configuration"
tags: [config, env, credentials]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Configuration

## Environment Variables

Create `.env` file in your project root:

```bash
# OpenAI
OPENAI_API_KEY=sk-your-key-here

# DeepSeek
DEEPSEEK_API_KEY=sk-your-key-here

# Anthropic (via OpenAI-compatible endpoint)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Ollama (local, no key needed)
# OLLAMA_BASE_URL=http://localhost:11434
```

**Never commit `.env` to git.** Add it to `.gitignore`:

```bash
echo ".env" >> .gitignore
```

## Kernel Configuration

The `AgentKernelConfig` controls agent behavior:

```typescript
import { AgentKernel } from "@vinhnt-sdk/core";
import { NullRunEventStore } from "@vinhnt-sdk/session";
import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";

const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: "gpt-4o-mini",
});

const kernel = new AgentKernel({
  // Required
  model,                    // LLM provider
  store: new NullRunEventStore(),  // Event store

  // Optional - Agent behavior
  maxSteps: 30,             // Max LLM calls per run (default: 30)
  maxTokens: 4096,          // Max tokens per response (default: 4096)
  maxToolCallsPerStep: 10,  // Max tool calls per step (default: 10)
  stepTimeout: 120000,      // Per-step timeout in ms (default: 120000)

  // Optional - Self-correction
  selfCorrectOnFailure: false,  // Auto-retry on tool failure
  maxSelfCorrectAttempts: 3,    // Max retry attempts

  // Optional - Sub-agents
  maxSubAgentDepth: 3,      // Max nesting depth for sub-agents

  // Optional - Permissions
  permissions: {
    autoApprovalEnabled: false,
    externalDirectoryAccess: false,
  },

  // Optional - Sandbox
  sandbox: {
    mode: "host",           // "host" | "process" | "container"
  },
});
```

## Provider Options

### OpenAI

```typescript
const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY!,
  defaultModel: "gpt-4o-mini",
  contextLimit: 128000,
  timeoutMs: 120000,
});
```

### DeepSeek

```typescript
const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY!,
  defaultModel: "deepseek-chat",
  contextLimit: 64000,
});
```

### Ollama (Local)

```typescript
const model = new OpenAICompatibleProvider({
  baseUrl: "http://localhost:11434/v1",
  defaultModel: "llama3",
  contextLimit: 8192,
});
```

### Anthropic (via OpenAI-compatible)

```typescript
const model = new OpenAICompatibleProvider({
  baseUrl: "https://api.anthropic.com/v1",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultModel: "claude-3-5-sonnet-20241022",
  contextLimit: 200000,
  headers: {
    "anthropic-version": "2023-06-01",
  },
});
```

## Provider Presets

Use built-in presets for common providers:

```typescript
import {
  createDeepSeekProvider,
  createAnthropicProvider,
  createOllamaProvider,
} from "@vinhnt-sdk/provider-openai-compatible";

// DeepSeek
const deepseek = createDeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

// Anthropic
const anthropic = createAnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Ollama
const ollama = createOllamaProvider({
  model: "llama3",
});
```

## Permission Rules

Control what tools can do:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    // Auto-approve all read operations
    permissionRiskDefaults: {
      read: "allow",
      write: "ask",
      destructive: "deny",
    },

    // Global rules for specific tools
    globalPermissionRules: {
      "shell": "ask",        // Always ask for shell commands
      "git": "allow",        // Allow all git operations
    },

    // Top-level categories
    topLevelPermissionRules: {
      allow: ["read_file", "list_directory"],
      deny: ["delete_file"],
      ask: ["execute_command"],
    },
  },
});
```

## Circuit Breaker

Protect against cascading failures:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  circuitBreakerOptions: {
    failureThreshold: 5,      // Open after 5 failures
    resetTimeoutMs: 60000,    // Try again after 60s
    successThreshold: 3,      // Close after 3 successes
  },
});
```

## Multi-Model Routing

Use different models for different tasks:

```typescript
const kernel = new AgentKernel({
  model: fastModel,           // Default model
  store: new NullRunEventStore(),
  modelRouting: {
    failoverModels: ["gpt-4o"],  // Fallback if primary fails
    perFeatureModels: {
      "code-review": "gpt-4o",   // Use GPT-4 for code review
      "summarization": "gpt-4o-mini",  // Use mini for summaries
    },
  },
});
```

## Next Steps

- [Hello World](/getting-started/hello-world) — Build your first agent
- [Creating Tools](/guides/creating-tools) — Build custom tools
- [Tool Permissions](/guides/tool-permissions) — Fine-grained permission control
