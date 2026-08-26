---
title: Authentication
description: Configure API keys and credentials
lang: en
type: guide
category: Getting Started
sidebarPosition: 4
---

# Authentication

vinhnt-sdk does not store your API keys. You provide credentials through resolution layers.

## Credential Resolution Order

Credentials are resolved in four layers (first match wins):

1. **Process environment variables** (highest priority)
2. **Managed credential store** (in-memory or persistent)
3. **Project `.env` file** (`.env` in working directory)
4. **User `.env` file** (`~/.env`)

## Option 1: Environment Variables
```bash
export DEEPSEEK_API_KEY="sk-..."
export OPENAI_API_KEY="sk-..."
```

```ts
import { createClient } from 'vinhnt-sdk';
const client = createClient({ provider: 'deepseek' });
```

## Option 2: `.env` Files
```env
DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

```ts
import 'dotenv/config';
import { createClient } from 'vinhnt-sdk';
const client = createClient({ provider: 'openai' });
```

## Option 3: Config Package
```ts
import { configureCredentials } from 'vinhnt-sdk-config';
configureCredentials({ deepseek: { apiKey: process.env.DEEPSEEK_API_KEY } });
```

## Option 4: Custom Credential Store

```ts
import { createClient, CredentialStore } from 'vinhnt-sdk';
const store: CredentialStore = {
  async get(provider) {
    const res = await fetch(`https://vault.internal/keys/${provider}`);
    return { apiKey: (await res.json()).apiKey };
  },
};
const client = createClient({ provider: 'deepseek', credentialStore: store });
```

## Provider Setup

| Provider | Env Variable | Local Required |
|----------|-------------|----------------|
| DeepSeek | `DEEPSEEK_API_KEY` | No |
| OpenAI | `OPENAI_API_KEY` | No |
| Anthropic | `ANTHROPIC_API_KEY` | No |
| Ollama | None | Yes (port 11434) |

## Security Best Practices

- Never commit API keys to version control — add `.env` to `.gitignore`
- Use environment variables in production
- Rotate keys regularly and revoke compromised credentials
- Use separate keys for dev, staging, and production
