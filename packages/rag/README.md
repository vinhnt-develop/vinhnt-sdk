# @vinhnt-sdk/rag

RAG (Retrieval-Augmented Generation) module for vinhnt-sdk — indexing, embedding, and semantic search.

## Install

```bash
# npm
npm install @vinhnt-sdk/rag

# pnpm (monorepo)
pnpm add @vinhnt-sdk/rag
```

## Quick Start

```typescript
import { Indexer, search, hybridSearch, ingestDirectory } from '@vinhnt-sdk/rag';

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
