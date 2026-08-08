# @vnt/model-adapters

AI model adapters for VNT Agent — OpenAI, Anthropic, and Google via AI SDK.

## Install

```bash
# npm
npm install @vnt/model-adapters

# pnpm (monorepo)
pnpm add @vnt/model-adapters
```

## Quick Start

```typescript
import { createModelProvider, withRetry, MultiProviderRegistry } from '@vnt/model-adapters';

const provider = createModelProvider({ type: 'openai', apiKey: process.env.OPENAI_API_KEY });
const response = await withRetry(() => provider.generate({ messages, model: 'gpt-4o' }));
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `AiSdkModelProvider` | Class | AI SDK v7 adapter with streaming |
| `createModelProvider` | Function | Factory for provider creation |
| `withRetry` | Function | Retry wrapper with exponential backoff |
| `RetryExhaustedError` | Error | Thrown when all retries fail |
| `countTokens`, `countTokensSafe` | Function | Token counting (tiktoken) |
| `MultiProviderRegistry` | Class | Multi-provider model registry |
| `PROVIDER_CATALOG` | Const | Built-in provider catalog (13+) |
| `getCapabilities` | Function | Provider capability detection |
| `matchProvider` | Function | Smart model-to-provider matching |
| `fetchExternalModelCatalog` | Function | External model catalog fetch |

## License

MIT
