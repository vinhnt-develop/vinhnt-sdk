# @vinhnt-sdk/knowledge

> Version: 0.1.2-beta.0 | Status: BETA

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
import { BoundedMemory, ContextCompressor } from '@vinhnt-sdk/knowledge';

// Create memory store
const memory = new BoundedMemory({ maxSize: 100 });

// Store memories
memory.store("User prefers dark mode", { tags: ["preferences"] });
memory.store("User is a developer", { tags: ["user-info"] });

// Search memories
const results = memory.search("dark mode");
console.log(results); // [{ content: "User prefers dark mode", ... }]

// Get context for agent
const context = memory.getContext("user preferences");
console.log(context); // "- User prefers dark mode\n- User is a developer"
```

## API Reference

### BoundedMemory

```typescript
import { BoundedMemory } from '@vinhnt-sdk/knowledge';

const memory = new BoundedMemory({ maxSize: 100 });

// Store memory
const item = memory.store("content", { metadata: { key: "value" }, tags: ["tag1"] });

// Search memories
const results = memory.search("query", { limit: 10 });

// Get all memories
const all = memory.getAll();

// Get memory by ID
const item = memory.getById("mem-123");

// Delete memory
memory.delete("mem-123");

// Get context for agent
const context = memory.getContext("query", { limit: 5 });
```

### ContextCompressor

```typescript
import { ContextCompressor } from '@vinhnt-sdk/knowledge';

const compressor = new ContextCompressor({ tokenBudget: 32000 });

// Compress conversation
const compressed = await compressor.compress({
  messages: [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
    // ... more messages
  ],
});

console.log(compressed.messages); // Compressed messages
console.log(compressed.tokens);   // Token count
```

### MemoryItem

```typescript
interface MemoryItem {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Dependencies

- `@vinhnt-sdk/schema` workspace:*

## Peer Dependencies

- `@vinhnt-sdk/tools` workspace:* (optional)

## Usage Examples

### Store User Preferences

```typescript
import { BoundedMemory } from '@vinhnt-sdk/knowledge';

const memory = new BoundedMemory({ maxSize: 50 });

// Store user preferences
memory.store("User prefers dark mode", { tags: ["preferences", "ui"] });
memory.store("User likes TypeScript", { tags: ["preferences", "language"] });

// Get context for agent
const context = memory.getContext("user preferences");
// Output:
// - User prefers dark mode
// - User likes TypeScript
```

### Compress Long Conversation

```typescript
import { ContextCompressor } from '@vinhnt-sdk/knowledge';

const compressor = new ContextCompressor({ tokenBudget: 4000 });

const conversation = {
  messages: [
    // ... many messages
  ],
};

const compressed = await compressor.compress(conversation);
console.log(`Reduced from ${conversation.messages.length} to ${compressed.messages.length} messages`);
```

### Search Memories

```typescript
import { BoundedMemory } from '@vinhnt-sdk/knowledge';

const memory = new BoundedMemory({ maxSize: 100 });

// Store memories
memory.store("TypeScript is awesome");
memory.store("JavaScript is also good");
memory.store("Python is great for ML");

// Search
const results = memory.search("TypeScript");
console.log(results.length); // 1

// Search with tags
const tagged = memory.search("", { tags: ["language"] });
console.log(tagged.length); // 3
```

## License

MIT
