import Database from "better-sqlite3";
import type { RetrievalResult } from "./types.js";
import { search as ftsSearch } from "./retriever.js";

function buildTermFrequency(text: string): Map<string, number> {
  const terms = text.toLowerCase().split(/\W+/).filter(Boolean);
  const tf = new Map<string, number>();
  for (const t of terms) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  return tf;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [term, countA] of a) {
    normA += countA * countA;
    const countB = b.get(term) ?? 0;
    dot += countA * countB;
  }
  for (const countB of b.values()) {
    normB += countB * countB;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function hybridSearch(
  db: Database.Database,
  query: string,
  topK: number = 10,
  ftsWeight: number = 0.5,
): RetrievalResult[] {
  const ftsResults = ftsSearch(db, query, topK * 2);

  const queryTerms = buildTermFrequency(query);
  const scored = ftsResults.map((r) => {
    const chunkTerms = buildTermFrequency(r.chunk.text);
    const vecScore = cosineSimilarity(queryTerms, chunkTerms);
    const combined = ftsWeight * r.score + (1 - ftsWeight) * vecScore;
    return { ...r, score: combined };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
