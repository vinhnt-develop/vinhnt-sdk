---
title: Xác thực
description: Cấu hình API keys và credentials
lang: vi
type: guide
category: Getting Started
sidebarPosition: 4
---

# Xác thực

vinhnt-sdk không lưu trữ API keys của bạn. Bạn cung cấp credential qua các lớp resolution.

## Thứ tự Resolution Credential

Credential được kiểm tra theo 4 lớp (kết quả đầu tiên thắng):

1. **Biến môi trường process** (ưu tiên cao nhất)
2. **Managed credential store** (in-memory hoặc persistent)
3. **File `.env` dự án** (`.env` trong thư mục working)
4. **File `.env` người dùng** (`~/.env`)

## Phương án 1: Biến môi trường
```bash
export DEEPSEEK_API_KEY="sk-..."
export OPENAI_API_KEY="sk-..."
```

```ts
import { createClient } from 'vinhnt-sdk';
const client = createClient({ provider: 'deepseek' });
```

## Phương án 2: File `.env`
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

## Phương án 3: Config Package
```ts
import { configureCredentials } from 'vinhnt-sdk-config';
configureCredentials({ deepseek: { apiKey: process.env.DEEPSEEK_API_KEY } });
```

## Phương án 4: Custom Credential Store

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

## Thiết lập theo Provider

| Provider | Biến Env | Cần Local |
|----------|---------|-----------|
| DeepSeek | `DEEPSEEK_API_KEY` | Không |
| OpenAI | `OPENAI_API_KEY` | Không |
| Anthropic | `ANTHROPIC_API_KEY` | Không |
| Ollama | Không cần | Có (port 11434) |

## Bảo mật tốt nhất

- Không bao giờ commit API keys vào version control — thêm `.env` vào `.gitignore`
- Sử dụng biến môi trường trong production
- Thay đổi key thường xuyên và thu hồi credential bị xâm phạm
- Tách riêng key cho dev, staging và production
