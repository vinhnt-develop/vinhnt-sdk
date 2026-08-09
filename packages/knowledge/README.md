# @vinhnt-sdk/knowledge

Memory and knowledge management for vinhnt-sdk — bounded memory, context compression, learning engine.

## Install

```bash
# npm
npm install @vinhnt-sdk/knowledge

# pnpm (monorepo)
pnpm add @vinhnt-sdk/knowledge
```

## Quick Start

```typescript
import { BoundedMemory, ContextCompressor, LearningEngine } from '@vinhnt-sdk/knowledge';

// Bounded memory with automatic eviction
const memory = new BoundedMemory({ maxItems: 1000 });
await memory.add({ key: "user_pref", value: "dark mode" });

// Context compression for long conversations
const compressor = new ContextCompressor({ tokenBudget: 32000 });
const compressed = await compressor.compress(longConversation);

// Learning engine for pattern detection
const learning = new LearningEngine();
learning.observe({ type: "user_action", data: { action: "search", query: "typescript" } });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `BoundedMemory` | Class | FIFO memory with automatic eviction |
| `ContextCompressor` | Class | Compress context to fit token budgets |
| `LearningEngine` | Class | Detect patterns from user actions |
| `LLMCompactor` | Class | LLM-based context compression |
| `MemoryItem` | Type | Memory item interface |
| `CompressorOptions` | Type | Compression configuration |

## Peer Dependencies

- `@vinhnt-sdk/tools` (optional) — For tool-based memory operations

## License

MIT
