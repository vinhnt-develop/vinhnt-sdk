---
title: "Configuration"
description: "Cấu hình environment, credentials và kernel settings"
lang: "vi"
type: "reference"
category: "Getting Started"
sidebarPosition: 3
sidebarLabel: "Configuration"
tags: [config, env, credentials]
version: "0.1.3"
lastUpdated: "2026-08-26"
---

# Configuration

## Biến Môi Trường

Tạo file `.env` trong root project:

```bash
# OpenAI
OPENAI_API_KEY=sk-your-key-here

# DeepSeek
DEEPSEEK_API_KEY=sk-your-key-here

# Anthropic (qua OpenAI-compatible endpoint)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Ollama (local, không cần key)
# OLLAMA_BASE_URL=http://localhost:11434
```

**KHÔNG commit `.env` lên git.** Thêm vào `.gitignore`:

```bash
echo ".env" >> .gitignore
```

## Kernel Configuration

`AgentKernelConfig` kiểm soát hành vi agent:

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
  // Bắt buộc
  model,                    // LLM provider
  store: new NullRunEventStore(),  // Event store

  // Tùy chọn - Hành vi agent
  maxSteps: 30,             // Số LLM calls tối đa mỗi run (mặc định: 30)
  maxTokens: 4096,          // Số tokens tối đa mỗi response (mặc định: 4096)
  maxToolCallsPerStep: 10,  // Số tool calls tối đa mỗi step (mặc định: 10)
  stepTimeout: 120000,      // Timeout mỗi step tính bằng ms (mặc định: 120000)

  // Tùy chọn - Tự sửa lỗi
  selfCorrectOnFailure: false,  // Tự retry khi tool fail
  maxSelfCorrectAttempts: 3,    // Số lần retry tối đa

  // Tùy chọn - Sub-agents
  maxSubAgentDepth: 3,      // Độ sâu nesting tối đa cho sub-agents

  // Tùy chọn - Permission
  permissions: {
    autoApprovalEnabled: false,
    externalDirectoryAccess: false,
  },

  // Tùy chọn - Sandbox
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

### Anthropic (qua OpenAI-compatible)

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

Sử dụng presets có sẵn cho các provider phổ biến:

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

Kiểm soát những gì tool có thể làm:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  permissions: {
    // Tự approve tất cả read operations
    permissionRiskDefaults: {
      read: "allow",
      write: "ask",
      destructive: "deny",
    },

    // Global rules cho cụ thể tools
    globalPermissionRules: {
      "shell": "ask",        // Luôn hỏi cho shell commands
      "git": "allow",        // Cho phép tất cả git operations
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

Bảo vệ chống cascading failures:

```typescript
const kernel = new AgentKernel({
  model,
  store: new NullRunEventStore(),
  circuitBreakerOptions: {
    failureThreshold: 5,      // Mở sau 5 lần fail
    resetTimeoutMs: 60000,    // Thử lại sau 60s
    successThreshold: 3,      // Đóng sau 3 lần thành công
  },
});
```

## Multi-Model Routing

Sử dụng model khác nhau cho các task khác nhau:

```typescript
const kernel = new AgentKernel({
  model: fastModel,           // Model mặc định
  store: new NullRunEventStore(),
  modelRouting: {
    failoverModels: ["gpt-4o"],  // Fallback nếu primary fail
    perFeatureModels: {
      "code-review": "gpt-4o",   // Dùng GPT-4 cho code review
      "summarization": "gpt-4o-mini",  // Dùng mini cho tóm tắt
    },
  },
});
```

## Bước Tiếp Theo

- [Hello World](/getting-started/hello-world) — Xây dựng agent đầu tiên
- [Creating Tools](/guides/creating-tools) — Xây dựng tool tùy chỉnh
- [Tool Permissions](/guides/tool-permissions) — Kiểm soát permission chi tiết
