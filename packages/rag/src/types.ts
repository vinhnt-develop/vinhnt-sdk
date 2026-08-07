export interface Document {
  id: string;
  sourceUri: string;
  title: string;
  mimeType: string;
  checksum: string;
  status: "active" | "deleted" | "pending";
  createdAt: string;
}

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
