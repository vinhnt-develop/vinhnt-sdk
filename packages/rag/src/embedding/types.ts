/**
 * Embedding provider abstraction for RAG vector search.
 * Supports multiple providers via a common interface.
 */

/** Configuration for embedding providers. */
export interface EmbeddingConfig {
  /** Provider name — string type for extensibility */
  provider: string;
  /** API key for cloud providers */
  apiKey?: string;
  /** Model name (provider-specific) */
  model?: string;
  /** Embedding dimensions (default: 1024) */
  dimensions?: number;
  /** Base URL for OpenAI-compatible providers */
  baseUrl?: string;
}

/** Result from embedding a single text. */
export interface EmbeddingResult {
  /** The embedding vector */
  embedding: number[];
  /** Token count used */
  tokenCount: number;
}

/** Provider interface for generating embeddings. */
export interface EmbeddingProvider {
  /** Provider name */
  readonly name: string;

  /**
   * Embed a single text.
   * @param text - Text to embed
   * @param inputType - "document" for indexing, "query" for search
   * @returns Embedding result with vector and token count
   */
  embed(
    text: string,
    inputType?: "document" | "query",
  ): Promise<EmbeddingResult>;

  /**
   * Embed multiple texts in batch.
   * @param texts - Array of texts to embed
   * @param inputType - "document" for indexing, "query" for search
   * @returns Array of embedding results
   */
  embedBatch(
    texts: string[],
    inputType?: "document" | "query",
  ): Promise<EmbeddingResult[]>;

  /** Get the embedding dimensions for this provider */
  getDimensions(): number;
}

/**
 * Registry for embedding providers.
 * User tự register provider mới thay vì fix cứng trong code.
 */
export class EmbeddingProviderRegistry {
  private providers = new Map<string, () => EmbeddingProvider>();

  /**
   * Register an embedding provider factory.
   */
  register(name: string, factory: () => EmbeddingProvider): void {
    this.providers.set(name, factory);
  }

  /**
   * Create an embedding provider by name.
   */
  create(name: string): EmbeddingProvider | null {
    const factory = this.providers.get(name);
    return factory ? factory() : null;
  }

  /**
   * Check if a provider is registered.
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * List all registered providers.
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai !== undefined && bi !== undefined) {
      dot += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
