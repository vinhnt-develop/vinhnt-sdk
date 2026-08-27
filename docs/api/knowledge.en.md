---
title: "@vinhnt-sdk/knowledge"
description: "Memory, context compression, and prompt building for agentic workflows"
version: "0.1.3"
lang: "en"
type: "reference"
category: "API Reference"
sidebarLabel: "knowledge"
---

# @vinhnt-sdk/knowledge

Memory storage, context compression, and prompt construction utilities for building stateful AI agents.

## Installation

```bash
npm install @vinhnt-sdk/knowledge
```

## Exports

### `InMemoryMemoryStore`

A simple in-memory implementation of the `MemoryStore` interface. Suitable for single-session or development use.

```ts
import { InMemoryMemoryStore } from "@vinhnt-sdk/knowledge";

const store = new InMemoryMemoryStore();
await store.write({ id: "m1", tier: "episodic", content: "User prefers dark mode" });
const items = await store.read("episodic");
```

**Methods:**
- `write(item: MemoryItem): Promise<void>` — Store a memory item.
- `read(tier: MemoryTier): Promise<MemoryItem[]>` — Retrieve all items in a tier.
- `clear(tier?: MemoryTier): Promise<void>` — Clear items in a tier, or all tiers if omitted.

---

### `BoundedMemory`

A memory store wrapper that enforces budget limits (max items or token-based) per tier. Evicts oldest items when limits are exceeded.

```ts
import { BoundedMemory, InMemoryMemoryStore } from "@vinhnt-sdk/knowledge";

const store = new InMemoryMemoryStore();
const memory = new BoundedMemory(store, { maxItems: 100, maxTokensPerTier: 4096 });

await memory.write({ id: "m1", tier: "episodic", content: "..." });
```

**Constructor:** `BoundedMemory(store: MemoryStore, options: BoundedMemoryOptions)`

**Options:**
- `maxItems?: number` — Maximum items per tier.
- `maxTokensPerTier?: number` — Maximum tokens per tier (uses `approximateTokens`).
- `evictionPolicy?: "oldest" | "largest"` — Strategy when limits are breached.

---

### `ContextCompressor`

A rule-based conversation compressor that preserves head and tail messages while summarizing the middle. Useful for fitting conversations within context windows.

```ts
import { ContextCompressor } from "@vinhnt-sdk/knowledge";

const compressor = new ContextCompressor({
  maxTokens: 4096,
  headMessages: 2,
  tailMessages: 4,
});

const compressed = await compressor.compress(conversation);
// Returns { messages: [...], summary: "...", originalTokens: 8000, compressedTokens: 3800 }
```

**Constructor:** `ContextCompressor(options: CompressorOptions)`

**Methods:**
- `compress(messages: Message[]): Promise<CompressionSummary>` — Compress messages to fit within token limits.

---

### `LlmCompactor`

An LLM-powered conversation compressor that uses a language model to generate intelligent summaries of the middle section of a conversation.

```ts
import { LlmCompactor } from "@vinhnt-sdk/knowledge";

const compressor = new LlmCompactor({
  maxTokens: 4096,
  headMessages: 2,
  tailMessages: 4,
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
});

const result = await compressor.compress(conversation);
```

**Constructor:** `LlmCompactor(options: LlmCompactorOptions)`

**Additional Options (extends `CompressorOptions`):**
- `model: string` — LLM model identifier.
- `apiKey: string` — API key for the LLM provider.
- `baseUrl?: string` — Custom API base URL.
- `systemPrompt?: string` — Custom summarization prompt.

---

### `buildPrompt`

Constructs a prompt string from an array of messages and optional configuration.

```ts
import { buildPrompt } from "@vinhnt-sdk/knowledge";

const prompt = buildPrompt(messages, {
  systemMessage: "You are a helpful assistant.",
  maxTokens: 4096,
  tokenBudget: 2048,
});
```

**Signature:** `buildPrompt(messages: Message[], options?: BuildPromptOptions): string`

**Options:**
- `systemMessage?: string` — System prompt prepended to output.
- `maxTokens?: number` — Hard token limit for output.
- `tokenBudget?: number` — Soft budget; truncates older messages if exceeded.

---

### `approximateTokens`

Estimates token count for a given text using a simple character-based heuristic.

```ts
import { approximateTokens } from "@vinhnt-sdk/knowledge";

const tokens = approximateTokens("Hello, world!"); // ~4
const tokens2 = approximateTokens(text, 3.5);      // custom chars-per-token ratio
```

**Signature:** `approximateTokens(text: string, charsPerToken?: number): number`

Default `charsPerToken` is `4`.

---

## Types

### `MemoryTier`

An open string type representing a memory classification tier.

```ts
type MemoryTier = string;
// Common values: "episodic", "semantic", "procedural", "working"
```

### `MemoryItem`

Represents a single stored memory.

```ts
interface MemoryItem {
  id: string;
  tier: MemoryTier;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### `MemoryStore`

Interface for memory storage backends.

```ts
interface MemoryStore {
  write(item: MemoryItem): Promise<void>;
  read(tier: MemoryTier): Promise<MemoryItem[]>;
  clear(tier?: MemoryTier): Promise<void>;
}
```

### `CompressorOptions`

Configuration for `ContextCompressor`.

```ts
interface CompressorOptions {
  maxTokens: number;
  headMessages?: number;
  tailMessages?: number;
  separator?: string;
}
```

### `LlmCompactorOptions`

Configuration for `LlmCompactor` (extends `CompressorOptions`).

```ts
interface LlmCompactorOptions extends CompressorOptions {
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt?: string;
  temperature?: number;
}
```

### `ConversationCompactor`

Shared interface for both compressor implementations.

```ts
interface ConversationCompactor {
  compress(messages: Message[]): Promise<CompressionSummary>;
}
```

### `CompressionSummary`

Result of a compression operation.

```ts
interface CompressionSummary {
  messages: Message[];
  summary: string;
  originalTokens: number;
  compressedTokens: number;
  removedCount: number;
}
```

## Dependencies

- `@vinhnt-sdk/schema` — Message and content type definitions.
- `@vinhnt-sdk/tools` (optional) — Required when using tool-call-aware compression.
