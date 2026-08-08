export { ingestDirectory } from "./ingestor.js";
export { chunkDocument } from "./chunker.js";
export { Indexer } from "./indexer.js";
export { search } from "./retriever.js";
export { hybridSearch, reciprocalRankFusion, hybridSearchWithVectors } from "./hybrid.js";
export { createRagSearchTool } from "./tool.js";
export { CodebaseMapper } from "./codebase-mapper.js";
export type { SymbolEntry, ImportEntry, CodebaseMap } from "./codebase-mapper.js";
export { createCodebaseSearchTool, createCodebaseFileTool, createCodebaseReferencesTool } from "./codebase-tool.js";
export type { Document, Chunk, RetrievalResult, IngestOptions, ChunkOptions, RAGConfig } from "./types.js";

// Embedding providers
export { OpenAIEmbeddingProvider } from "./embedding/openai.js";
export { VoyageEmbeddingProvider } from "./embedding/voyage.js";
export type { EmbeddingConfig, EmbeddingProvider, EmbeddingResult } from "./embedding/types.js";
export { cosineSimilarity } from "./embedding/types.js";

// Vector store
export { SqliteVecStore } from "./vector/sqlite-vec.js";
export type { VectorStore, VectorStoreConfig, VectorEntry, VectorSearchResult } from "./vector/types.js";
