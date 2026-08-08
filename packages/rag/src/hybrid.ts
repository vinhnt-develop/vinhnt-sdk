import Database from "better-sqlite3";
import type { RetrievalResult } from "./types.js";
import { search as ftsSearch } from "./retriever.js";

/**
 * Reciprocal Rank Fusion (RRF) for combining multiple ranked lists.
 * Formula: score(d) = Σ 1/(k + rank(d))
 * Default k=60 is standard per Cormack et al. 2009.
 *
 * @param rankedLists - Array of ranked result lists
 * @param k - RRF constant (default 60)
 * @returns Merged and reranked results
 */
export function reciprocalRankFusion<T extends { chunk: { id: string } }>(
  rankedLists: T[][],
  k: number = 60,
): T[] {
  const scores = new Map<string, { item: T; score: number }>();

  for (const list of rankedLists) {
    for (let rank = 0; rank < list.length; rank++) {
      const item = list[rank];
      if (!item) continue;
      const chunkId = item.chunk.id;
      const existing = scores.get(chunkId);
      const rrfScore = 1 / (k + rank + 1); // rank is 0-indexed

      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(chunkId, { item, score: rrfScore });
      }
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}

/**
 * Hybrid search combining FTS5 with Reciprocal Rank Fusion.
 * This is the recommended approach for 2026 (replaces score-weighted blending).
 *
 * @param db - SQLite database
 * @param query - Search query
 * @param topK - Number of results to return
 * @param options - Configuration options
 * @returns Ranked results
 */
export function hybridSearch(
  db: Database.Database,
  query: string,
  topK: number = 10,
  options: {
    /** RRF constant (default 60) */
    rrfK?: number;
    /** Legacy: FTS weight (ignored when using RRF) */
    ftsWeight?: number;
  } = {},
): RetrievalResult[] {
  // Get FTS results (fetch more for better fusion)
  const ftsResults = ftsSearch(db, query, topK * 3);

  // For now, use FTS results directly with RRF
  // When vector search is available, combine with vector results
  const rankedLists = [ftsResults];

  // If we had vector results, we'd add them here:
  // if (vectorResults.length > 0) {
  //   rankedLists.push(vectorResults);
  // }

  const fused = reciprocalRankFusion(rankedLists, options.rrfK ?? 60);
  return fused.slice(0, topK);
}

/**
 * Hybrid search with vector results (for use when embedding provider is available).
 *
 * @param ftsResults - FTS5 search results
 * @param vectorResults - Vector similarity search results
 * @param topK - Number of results to return
 * @param options - Configuration options
 * @returns Merged and reranked results
 */
export function hybridSearchWithVectors(
  ftsResults: RetrievalResult[],
  vectorResults: RetrievalResult[],
  topK: number = 10,
  options: {
    /** RRF constant (default 60) */
    rrfK?: number;
    /** Alpha weighting for score-based fusion (0-1) */
    alpha?: number;
  } = {},
): RetrievalResult[] {
  if (options.alpha !== undefined) {
    // Score-based fusion (alternative to RRF)
    const alpha = Math.max(0, Math.min(1, options.alpha));
    const allChunks = new Map<string, RetrievalResult>();

    for (const r of ftsResults) {
      allChunks.set(r.chunk.id, { ...r, score: r.score * alpha });
    }

    for (const r of vectorResults) {
      const existing = allChunks.get(r.chunk.id);
      if (existing) {
        existing.score += r.score * (1 - alpha);
      } else {
        allChunks.set(r.chunk.id, { ...r, score: r.score * (1 - alpha) });
      }
    }

    return Array.from(allChunks.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Default: Reciprocal Rank Fusion
  const rankedLists = [ftsResults, vectorResults];
  const fused = reciprocalRankFusion(rankedLists, options.rrfK ?? 60);
  return fused.slice(0, topK);
}
