# @vinhnt-sdk/knowledge

> Version: 0.1.2-beta.0 | Status: BETA

Memory and knowledge management for VNT Agent — bounded memory, context compression, learning engine.

**npm:** `npm install @vinhnt-sdk/knowledge`

---

## Installation

```bash
npm install @vinhnt-sdk/knowledge
```

## Overview

The knowledge package provides memory and context management capabilities for AI coding agents. It includes bounded memory stores, context compression, and prompt building utilities.

## Core Concepts

### Memory System

Memory stores are used to persist information across sessions:

```typescript
import { InMemoryMemoryStore, BoundedMemory } from "@vinhnt-sdk/knowledge";

const memory = new InMemoryMemoryStore();
const bounded = new BoundedMemory(memory, { maxItems: 1000 });
```

### Context Compression

Context compression helps manage long conversations:

```typescript
import { ContextCompressor, LlmCompactor } from "@vinhnt-sdk/knowledge";

const compressor = new ContextCompressor({
  maxTokens: 4000,
  compactor: new LlmCompactor(modelProvider),
});
```

### Prompt Building

Build prompts from memory and context:

```typescript
import { buildPrompt } from "@vinhnt-sdk/knowledge";

const prompt = await buildPrompt({
  memory: boundedMemory,
  maxTokens: 2000,
  query: "What did we discuss about the API?",
});
```

## API Reference

### InMemoryMemoryStore

```typescript
class InMemoryMemoryStore implements MemoryStore {
  add(item: MemoryItem): Promise<void>;
  search(query: string, limit?: number): Promise<MemoryItem[]>;
  get(id: string): Promise<MemoryItem | null>;
  delete(id: string): Promise<boolean>;
  list(): Promise<MemoryItem[]>;
}
```

In-memory memory store for development and testing.

### BoundedMemory

```typescript
class BoundedMemory implements MemoryStore {
  constructor(
    store: MemoryStore,
    limits: BoundedMemoryLimits
  );
  add(item: MemoryItem): Promise<void>;
  search(query: string, limit?: number): Promise<MemoryItem[]>;
}
```

Bounded memory store with size limits.

### ContextCompressor

```typescript
class ContextCompressor {
  constructor(options: CompressorOptions);
  compress(messages: ChatMessage[]): Promise<ChatMessage[]>;
}
```

Compresses context to fit within token limits.

### buildPrompt

```typescript
function buildPrompt(options: PromptBuilderOptions): Promise<string>;
```

Builds a prompt from memory and context.

## Examples

### Using Memory

```typescript
import { InMemoryMemoryStore } from "@vinhnt-sdk/knowledge";

const memory = new InMemoryMemoryStore();

// Add memories
await memory.add({
  id: "1",
  content: "User prefers TypeScript over JavaScript",
  metadata: { type: "preference" },
});

// Search memories
const results = await memory.search("TypeScript");
console.log(results);
```

### Using Context Compression

```typescript
import { ContextCompressor } from "@vinhnt-sdk/knowledge";

const compressor = new ContextCompressor({
  maxTokens: 4000,
});

const compressed = await compressor.compress([
  { role: "user", content: "Long conversation..." },
  { role: "assistant", content: "Response..." },
]);
```
