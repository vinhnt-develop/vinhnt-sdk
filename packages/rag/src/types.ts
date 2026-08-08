export interface Document {
  id: string;
  sourceUri: string;
  title: string;
  mimeType: string;
  checksum: string;
  status: string;
  createdAt: string;
}

/** Default document statuses — exported for convenience */
export const KNOWN_DOCUMENT_STATUSES = ["active", "deleted", "pending"] as const;

export interface Chunk {
  id: string;
  documentId: string;
  ordinal: number;
  text: string;
  tokenCount: number;
  headingPath: string;
  charRange: { start: number; end: number };
}

export interface RetrievalResult {
  chunk: Chunk;
  document: Document;
  score: number;
}

export interface IngestOptions {
  rootDir: string;
  excludePatterns?: string[];
  includePatterns?: string[];
  chunkSize?: number;
  chunkOverlap?: number;
  headingLevels?: number;
}

export interface ChunkOptions {
  maxLines?: number;
  overlapLines?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  headingLevels?: number;
}

export interface RetrievedChunk {
  readonly content: string;
  readonly sourceId: string;
  readonly score: number;
}

export interface Retriever {
  search(query: string, scope?: { topK?: number }): Promise<readonly RetrievedChunk[]>;
}

/** Configuration for RAG with vector search support. */
export interface RAGConfig {
  /** Embedding provider configuration */
  embedding?: {
    /** Provider name — string type, NOT closed union */
    provider: string;
    /** API key for cloud providers */
    apiKey?: string;
    /** Model name (provider-specific) */
    model?: string;
    /** Embedding dimensions */
    dimensions?: number;
    /** Base URL for provider API (optional, for self-hosted) */
    baseUrl?: string;
  };
  /** Vector store configuration */
  vector?: {
    /** Backend type — string type, NOT closed union */
    backend: string;
    /** Database path */
    dbPath?: string;
  };
  /** Search configuration */
  search?: {
    /** RRF constant (default 60) */
    rrfK?: number;
    /** Alpha weighting for score-based fusion (0-1) */
    alpha?: number;
    /** Number of results to return */
    topK?: number;
  };
  /** Chunking configuration */
  chunking?: {
    /** Chunk strategy — string type, NOT closed union */
    strategy: string;
    /** Maximum chunk size in tokens */
    chunkSize?: number;
    /** Chunk overlap in tokens */
    chunkOverlap?: number;
  };
}

/** Default embedding providers — exported for convenience */
export const KNOWN_EMBEDDING_PROVIDERS = ["openai", "voyage", "local"] as const;

/** Default vector backends — exported for convenience */
export const KNOWN_VECTOR_BACKENDS = ["sqlite-vec", "lancedb"] as const;

/** Default chunking strategies — exported for convenience */
export const KNOWN_CHUNKING_STRATEGIES = ["recursive", "semantic", "code-aware"] as const;
