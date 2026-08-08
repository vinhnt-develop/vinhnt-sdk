/**
 * Vector store abstraction for RAG semantic search.
 * Supports multiple backends via a common interface.
 */

/** Configuration for vector stores. */
export interface VectorStoreConfig {
  /** Backend type — string type for extensibility */
  backend: string;
  /** Database path (for sqlite-vec) */
  dbPath?: string;
  /** Embedding dimensions */
  dimensions: number;
}

/** A stored vector with metadata. */
export interface VectorEntry {
  /** Chunk ID (foreign key) */
  chunkId: string;
  /** Document ID (foreign key) */
  documentId: string;
  /** The embedding vector */
  embedding: number[];
  /** Optional metadata for filtering */
  metadata?: Record<string, unknown>;
}

/** Search result from vector store. */
export interface VectorSearchResult {
  /** Chunk ID */
  chunkId: string;
  /** Document ID */
  documentId: string;
  /** Cosine similarity score (0-1) */
  score: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Vector store interface for storing and searching embeddings.
 * Design allows swapping backends (sqlite-vec → lancedb) later.
 */
export interface VectorStore {
  /** Backend name */
  readonly name: string;

  /**
   * Store vectors in the database.
   * @param entries - Array of vector entries to store
   */
  upsert(entries: VectorEntry[]): Promise<void>;

  /**
   * Search for similar vectors using cosine similarity.
   * @param query - Query embedding vector
   * @param topK - Number of results to return
   * @param filter - Optional filter by document ID
   * @returns Ranked search results
   */
  search(
    query: number[],
    topK?: number,
    filter?: { documentId?: string },
  ): Promise<VectorSearchResult[]>;

  /**
   * Delete vectors by chunk IDs.
   * @param chunkIds - Array of chunk IDs to delete
   */
  delete(chunkIds: string[]): Promise<void>;

  /**
   * Delete all vectors for a document.
   * @param documentId - Document ID to delete vectors for
   */
  deleteByDocument(documentId: string): Promise<void>;

  /**
   * Get the total number of vectors stored.
   */
  count(): Promise<number>;

  /**
   * Close the connection and clean up resources.
   */
  close(): Promise<void>;
}

/**
 * Registry for vector store backends.
 * User tự register backend mới thay vì fix cứng trong code.
 */
export class VectorStoreRegistry {
  private backends = new Map<string, (config: VectorStoreConfig) => VectorStore>();

  /**
   * Register a vector store backend factory.
   */
  register(name: string, factory: (config: VectorStoreConfig) => VectorStore): void {
    this.backends.set(name, factory);
  }

  /**
   * Create a vector store by backend name.
   */
  create(config: VectorStoreConfig): VectorStore | null {
    const factory = this.backends.get(config.backend);
    return factory ? factory(config) : null;
  }

  /**
   * Check if a backend is registered.
   */
  has(name: string): boolean {
    return this.backends.has(name);
  }

  /**
   * List all registered backends.
   */
  list(): string[] {
    return Array.from(this.backends.keys());
  }
}
