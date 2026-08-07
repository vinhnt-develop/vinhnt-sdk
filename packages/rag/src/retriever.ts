import type Database from "better-sqlite3";
import type { Chunk, Document, RetrievalResult } from "./types.js";

interface FtsRow {
  rowid: number;
  rank: number;
}

interface ChunkRow {
  rowid: number;
  id: string;
  document_id: string;
  ordinal: number;
  text: string;
  token_count: number;
  heading_path: string;
  char_start: number;
  char_end: number;
}

interface DocRow {
  id: string;
  source_uri: string;
  title: string;
  mime_type: string;
  checksum: string;
  status: string;
  created_at: string;
}

export function search(
  db: Database.Database,
  query: string,
  topK: number = 10,
): RetrievalResult[] {
  const sanitized = query.replace(/['"]/g, "");
  const terms = sanitized
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t}"`)
    .join(" OR ");
  if (!terms) return [];

  const ftsRows = db
    .prepare(
      `SELECT rowid, rank FROM chunks_fts WHERE chunks_fts MATCH ? ORDER BY rank LIMIT ?`,
    )
    .all(terms, topK) as FtsRow[];

  if (ftsRows.length === 0) return [];

  const rowids = ftsRows.map((r) => r.rowid);
  const rankMap = new Map<number, number>();
  for (const r of ftsRows) {
    rankMap.set(r.rowid, r.rank);
  }

  const placeholders = rowids.map(() => "?").join(",");
  const chunkRows = db
    .prepare(
      `SELECT * FROM chunks WHERE rowid IN (${placeholders})`,
    )
    .all(...rowids) as ChunkRow[];

  const docIds = [...new Set(chunkRows.map((c) => c.document_id))];
  const docPlaceholders = docIds.map(() => "?").join(",");
  const docRows = db
    .prepare(
      `SELECT * FROM documents WHERE id IN (${docPlaceholders})`,
    )
    .all(...docIds) as DocRow[];
  const docMap = new Map<string, Document>();
  for (const d of docRows) {
    docMap.set(d.id, {
      id: d.id,
      sourceUri: d.source_uri,
      title: d.title,
      mimeType: d.mime_type,
      checksum: d.checksum,
      status: d.status as Document["status"],
      createdAt: d.created_at,
    });
  }

  const results: RetrievalResult[] = [];
  for (const chunkRow of chunkRows) {
    const rank = rankMap.get(chunkRow.rowid) ?? 0;
    const score = 1 / (1 + Math.abs(rank));
    const doc = docMap.get(chunkRow.document_id);
    if (!doc) continue;
    const chunk: Chunk = {
      id: chunkRow.id,
      documentId: chunkRow.document_id,
      ordinal: chunkRow.ordinal,
      text: chunkRow.text,
      tokenCount: chunkRow.token_count,
      headingPath: chunkRow.heading_path,
      charRange: { start: chunkRow.char_start, end: chunkRow.char_end },
    };
    results.push({ chunk, document: doc, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
