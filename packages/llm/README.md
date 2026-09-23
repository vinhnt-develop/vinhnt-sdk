# @vinhnt-sdk/llm

> Version: 0.5.2 | Status: stable (TokenMeter deprecated → use `@vinhnt-sdk/trace`)

LLM adapter abstraction, registry, retry policy, and model-caller for vinhnt-sdk.

## Install

```bash
npm install @vinhnt-sdk/llm
# or
pnpm add @vinhnt-sdk/llm
```

## Quick Start

```typescript
import { LlmRegistry } from "@vinhnt-sdk/llm";
import { OpenAICompatibleProvider } from "@vinhnt-sdk/provider-openai-compatible";

const registry = new LlmRegistry();
registry.register("openai-compatible", new OpenAICompatibleProvider({ /* ... */ }));

const adapter = registry.get("openai-compatible");
// adapter.stream(request) → AsyncIterable<StreamChunk>
```

## API Reference

Full export list, types, and examples: [docs/api/llm.en.md](../../docs/api/llm.en.md) · [docs/api/llm.vi.md](../../docs/api/llm.vi.md)

### Key exports

| Export | Kind | Description |
|--------|------|-------------|
| `LlmAdapter` | abstract class | Base class for provider adapters (`stream`, `providerInfo`) |
| `LlmRegistry` | class | Register/retrieve adapters by provider name |
| `TokenMeter` | class | **Deprecated** — use `CostMeter` from `@vinhnt-sdk/trace` |
| `shouldRetry` | function | Retry policy (status codes, `retryable`, max attempts) |
| `calculateDelay` | function | Exponential backoff with jitter and `Retry-After` |

## Dependencies

- `@vinhnt-sdk/schema`
- `@vinhnt-sdk/config` (workspace)
- `@vinhnt-sdk/tools` (workspace)

## License

MIT
