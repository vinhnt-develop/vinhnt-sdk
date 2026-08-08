import type {
  VectorStore,
  VectorStoreConfig,
  VectorEntry,
  VectorSearchResult,
} from "./types.js";

/**
 * SQLite-vec based vector store.
 * Uses brute-force cosine similarity (no ANN yet as of mid-2026).
 * Suitable for codebases under ~50K chunks.
 *
 * Note: This is a fallback implementation when sqlite-vec is not available.
 * For production, use the sqlite-vec extension for better performance.
 */
export class SqliteVecStore implements VectorStore {
  readonly name = "sqlite-vec";
  private readonly db: import("better-sqlite3").Database;
  private readonly dimensions: number;

  constructor(config: VectorStoreConfig) {
    this.dimensions = config.dimensions;
    // We'll use better-sqlite3 directly for vector storage
    // sqlite-vec extension would be loaded here if available
    const Database = require("better-sqlite3");
    this.db = new Database(config.dbPath ?? ":memory:");
    this.db.pragma("journal_mode = WAL");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vectors (
        chunk_id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        embedding BLOB NOT NULL,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_vectors_document ON vectors(document_id);
    `);
  }

  /**
   * Convert float array to Buffer for storage.
   */
  private embeddingToBuffer(embedding: number[]): Buffer {
    const buffer = Buffer.alloc(this.dimensions * 4);
    for (let i = 0; i < this.dimensions; i++) {
      const val = embedding[i];
      if (val !== undefined) {
        buffer.writeFloatLE(val, i * 4);
      }
    }
    return buffer;
  }

  /**
   * Convert Buffer back to float array.
   */
  private bufferToEmbedding(buffer: Buffer): number[] {
    const embedding: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      embedding.push(buffer.readFloatLE(i * 4));
    }
    return embedding;
  }

  /**
   * Calculate cosine similarity between two vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
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

  async upsert(entries: VectorEntry[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vectors (chunk_id, document_id, embedding, metadata)
      VALUES (?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      for (const entry of entries) {
        stmt.run(
          entry.chunkId,
          entry.documentId,
          this.embeddingToBuffer(entry.embedding),
          entry.metadata ? JSON.stringify(entry.metadata) : null,
        );
      }
    });
    tx();
  }

  async search(
    query: number[],
    topK: number = 10,
    filter?: { documentId?: string },
  ): Promise<VectorSearchResult[]> {
    let sql = "SELECT chunk_id, document_id, embedding FROM vectors";
    const params: unknown[] = [];

    if (filter?.documentId) {
      sql += " WHERE document_id = ?";
      params.push(filter.documentId);
    }

    const rows = this.db.prepare(sql).all(...params) as Array<{
      chunk_id: string;
      document_id: string;
      embedding: Buffer;
    }>;

    // Calculate cosine similarity for all vectors (brute-force)
    const results: VectorSearchResult[] = rows.map((row) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      score: this.cosineSimilarity(query, this.bufferToEmbedding(row.embedding)),
    }));

    // Sort by score descending and return topK
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async delete(chunkIds: string[]): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM vectors WHERE chunk_id = ?");
    const tx = this.db.transaction(() => {
      for (const id of chunkIds) {
        stmt.run(id);
      }
    });
    tx();
  }

  async deleteByDocument(documentId: string): Promise<void> {
    this.db.prepare("DELETE FROM vectors WHERE document_id = ?").run(documentId);
  }

  async count(): Promise<number> {
    const result = this.db.prepare("SELECT COUNT(*) as count FROM vectors").get() as { count: number };
    return result.count;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
