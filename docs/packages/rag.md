# @vinhnt-sdk/rag

> RAG indexing, embedding, chunking, and semantic search.

**npm:** `npm install @vinhnt-sdk/rag`  
**Size:** ~16 KB  
**Dependencies:** `@vinhnt-sdk/core`, `@vinhnt-sdk/schema`  
**Peer deps:** `better-sqlite3` (optional)

---

## Overview

`rag` provides Retrieval-Augmented Generation capabilities:

- **Ingestion** — Index directories of documents
- **Chunking** — Split documents into semantically meaningful chunks
- **Search** — Vector search and hybrid search
- **Codebase Mapping** — Understand code structure

## Installation

```bash
npm install @vinhnt-sdk/rag
```

## Exports

### Ingestion

```typescript
import { ingestDirectory } from "@vinhnt-sdk/rag";

// Index a directory
await ingestDirectory("./src", {
  patterns: ["**/*.ts", "**/*.tsx"],
  exclude: ["node_modules", "dist"],
});
```

### Indexer

```typescript
import { Indexer } from "@vinhnt-sdk/rag";

const indexer = new Indexer();

// Add documents
await indexer.addDocument({
  path: "src/main.ts",
  content: fileContent,
});

// Search
const results = await indexer.search("how to read a file", {
  topK: 5,
});
```

### Search

```typescript
import { search, hybridSearch } from "@vinhnt-sdk/rag";

// Vector search
const results = await search("error handling patterns", {
  indexer,
  topK: 10,
});

// Hybrid search (vector + keyword)
const results = await hybridSearch("error handling", {
  indexer,
  topK: 10,
});
```

### Chunking

```typescript
import { chunkDocument } from "@vinhnt-sdk/rag";

const chunks = chunkDocument(content, {
  maxChunkSize: 1000,
  overlap: 200,
  strategy: "semantic",  // or "fixed", "paragraph"
});
```

### Codebase Mapping

```typescript
import { CodebaseMapper } from "@vinhnt-sdk/rag";

const mapper = new CodebaseMapper();
await mapper.analyze("./src");

// Get symbol relationships
const symbols = mapper.getSymbols();
const imports = mapper.getImports("src/main.ts");
const references = mapper.getReferences("MyClass");
```

### RAG Tools

```typescript
import { createRagSearchTool, createCodebaseSearchTool } from "@vinhnt-sdk/rag";

// Create RAG search tool for the agent
const ragTool = createRagSearchTool({ indexer });

// Create codebase-aware tools
const searchTool = createCodebaseSearchTool({ mapper });
const fileTool = createCodebaseFileTool({ mapper });
const refsTool = createCodebaseReferencesTool({ mapper });
```
