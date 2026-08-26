---
title: "Configuration"
description: "Configure your agent"
lang: "en"
type: "guide"
category: "Guides"
sidebarPosition: 3
---

# Configuration

vinhnt-sdk is a library, not an application. There is no config file or config directory. You configure your agent programmatically via the constructor.

## Kernel Configuration

The `Kernel` class accepts a configuration object that defines your agent's behavior:

```typescript
import { Kernel } from "vinhnt-sdk";

const kernel = new Kernel({
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: "You are a helpful assistant.",
  tools: [],
  plugins: [],
});
```

## Environment Variables

Use the `config` package to load environment variables with type safety:

```typescript
import config from "config";

interface AppConfig {
  apiKey: string;
  baseUrl: string;
  debug: boolean;
}

const appConfig = config.get<AppConfig>("app");
```

## Custom Config Schema with Zod

Validate your configuration at runtime using Zod schemas:

```typescript
import { z } from "zod";

const ConfigSchema = z.object({
  apiKey: z.string().min(1),
  model: z.enum(["gpt-4", "gpt-3.5-turbo"]),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().positive(),
});

type Config = z.infer<typeof ConfigSchema>;

const validatedConfig = ConfigSchema.parse(rawConfig);
```

## 4-Layer Credential Resolution

Credentials are resolved in the following order (highest priority first):

| Layer | Source | Priority |
|-------|--------|----------|
| 1 | Constructor options | Highest |
| 2 | Environment variables | High |
| 3 | Config file | Medium |
| 4 | Default values | Lowest |

```typescript
// Layer 1: Constructor takes precedence
const kernel = new Kernel({
  apiKey: process.env.API_KEY, // Layer 2 fallback
});
```

## Settings Namespace System

Organize settings using namespaces to avoid conflicts:

```typescript
const kernel = new Kernel({
  settings: {
    "llm.openai": { apiKey: "...", model: "gpt-4" },
    "llm.anthropic": { apiKey: "...", model: "claude-3" },
    "storage.redis": { url: "redis://localhost" },
    "logging.level": "info",
  },
});
```

## Configuration Precedence

When multiple configuration sources exist, values are merged with the following precedence:

1. **Runtime overrides** — passed directly to method calls
2. **Constructor options** — highest-level static config
3. **Namespace settings** — feature-specific overrides
4. **Environment variables** — system-level config
5. **Default values** — built-in fallbacks

```typescript
// Runtime override takes precedence over all
const response = await kernel.chat(messages, {
  temperature: 0.2, // Overrides constructor config
});
```

Always validate configuration at startup to catch errors early. Use Zod schemas for runtime validation and TypeScript types for compile-time safety.
