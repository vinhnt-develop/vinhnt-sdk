import Database from "better-sqlite3";
import type { Chunk, Document, RetrievalResult } from "./types.js";
import { search as searchFts } from "./retriever.js";
import { hybridSearch as hybridSearchFts } from "./hybrid.js";

export type FtsTokenizer = "unicode61" | "trigram" | "ascii";

function buildSchema(tokenizer: FtsTokenizer): string {
  const tokenizeClause = tokenizer === "ascii"
    ? "tokenize='ascii'"
    : tokenizer === "trigram"
    ? "tokenize='trigram'"
    : "tokenize='unicode61'";

  return `
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  source_uri TEXT NOT NULL,
  title TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  checksum TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  ordinal INTEGER NOT NULL,
  text TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  heading_path TEXT NOT NULL DEFAULT '',
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  text,
  heading_path,
  content='chunks',
  content_rowid='rowid',
  ${tokenizeClause}
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
`;
}

export class Indexer {
  private db: Database.Database;

  constructor(dbPath?: string, tokenizer?: FtsTokenizer) {
    this.db = new Database(dbPath ?? ":memory:");
    this.db.pragma("journal_mode = WAL");
    this.db.exec(buildSchema(tokenizer ?? "unicode61"));
  }

  addDocument(doc: Document): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO documents (id, source_uri, title, mime_type, checksum, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(doc.id, doc.sourceUri, doc.title, doc.mimeType, doc.checksum, doc.status, doc.createdAt);
  }

  addChunks(chunks: Chunk[]): void {
    const insertChunk = this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, document_id, ordinal, text, token_count, heading_path, char_start, char_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertFts = this.db.prepare(`
      INSERT INTO chunks_fts (rowid, text, heading_path)
      VALUES (?, ?, ?)
    `);
    const tx = this.db.transaction(() => {
      for (const chunk of chunks) {
        const result = insertChunk.run(
          chunk.id,
          chunk.documentId,
          chunk.ordinal,
          chunk.text,
          chunk.tokenCount,
          chunk.headingPath,
          chunk.charRange.start,
          chunk.charRange.end,
        );
        insertFts.run(result.lastInsertRowid, chunk.text, chunk.headingPath);
      }
    });
    tx();
  }

  markDocumentStatus(id: string, status: "indexed" | "failed"): void {
    this.db.prepare("UPDATE documents SET status = ? WHERE id = ?").run(status, id);
  }

  getDocument(id: string): Document | undefined {
    const row = this.db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      id: row.id as string,
      sourceUri: row.source_uri as string,
      title: row.title as string,
      mimeType: row.mime_type as string,
      checksum: row.checksum as string,
      status: row.status as Document["status"],
      createdAt: row.created_at as string,
    };
  }

  getAllDocuments(): Document[] {
    const rows = this.db.prepare("SELECT * FROM documents ORDER BY created_at").all() as Record<string, unknown>[];
    return rows.map((row) => ({
      id: row.id as string,
      sourceUri: row.source_uri as string,
      title: row.title as string,
      mimeType: row.mime_type as string,
      checksum: row.checksum as string,
      status: row.status as Document["status"],
      createdAt: row.created_at as string,
    }));
  }

  search(query: string, topK: number = 10): RetrievalResult[] {
    return searchFts(this.db, query, topK);
  }

  hybridSearch(query: string, topK: number = 10, ftsWeight?: number): RetrievalResult[] {
    return hybridSearchFts(this.db, query, topK, ftsWeight);
  }

  close(): void {
    this.db.close();
  }
}
