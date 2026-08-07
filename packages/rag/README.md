# @vnt/rag

RAG (Retrieval-Augmented Generation) module for VNT Agent — indexing, embedding, and semantic search.

## Install

```bash
# npm
npm install @vnt/rag

# pnpm (monorepo)
pnpm add @vnt/rag
```

## Quick Start

```typescript
import { Indexer, search, hybridSearch, ingestDirectory } from '@vnt/rag';

await ingestDirectory('./src', { patterns: ['**/*.ts'] });
const indexer = new Indexer();
const results = await hybridSearch(query, { indexer, topK: 10 });
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `Indexer` | Class | Vector index management |
| `ingestDirectory` | Function | Ingest directory into index |
| `chunkDocument` | Function | Split documents into chunks |
| `search` | Function | Semantic vector search |
| `hybridSearch` | Function | Combined semantic + keyword search |
| `CodebaseMapper` | Class | Codebase structure mapping |
| `createRagSearchTool` | Function | LLM-facing RAG search tool |
| `createCodebaseSearchTool` | Function | Code-aware search tool |
| `createCodebaseFileTool` | Function | File retrieval tool |
| `createCodebaseReferencesTool` | Function | Reference lookup tool |

## License

MIT
