/**
 * Unified context budget — single owner for context-window related limits.
 *
 * Derives per-consumer limits from a single `maxContextTokens` so that
 * guard sanitization, knowledge compression, subagent output, and
 * compaction threshold stay coordinated instead of using scattered
 * hardcoded constants (128k / 500 / 4096 / 0.75).
 *
 * @module context/context-budget
 */

/** Unified context budget — all fields optional when partial. */
export interface ContextBudget {
  /** Maximum context window in tokens. Default: 128_000. */
  readonly maxContextTokens: number;
  /** Max chars for a single tool output before truncation. Default: 500. */
  readonly maxToolOutputChars: number;
  /** Max chars for subagent output returned to parent. Default: 4096. */
  readonly maxSubagentOutputChars: number;
  /** Max chars for sanitizer truncation before LLM context. Default: 128_000. */
  readonly sanitizeLimitChars: number;
  /** Compaction threshold ratio (0-1). Default: 0.75. */
  readonly compactionThreshold: number;
}

/** Default ratios derived from `maxContextTokens` (chars ≈ tokens * 4). */
export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  maxContextTokens: 128_000,
  maxToolOutputChars: 500,
  maxSubagentOutputChars: 4096,
  sanitizeLimitChars: 128_000,
  compactionThreshold: 0.75,
};

/**
 * Derive a full ContextBudget from partial overrides.
 *
 * When only `maxContextTokens` is provided, other limits are derived
 * using sensible ratios relative to the window; when omitted, defaults apply.
 *
 * @example
 * ```ts
 * const budget = deriveContextBudget({ maxContextTokens: 200_000 });
 * // sanitizeLimitChars stays 128_000 (absolute char cap, not token-derived)
 * // maxToolOutputChars stays 500, etc.
 * ```
 */
export function deriveContextBudget(partial?: Partial<ContextBudget>): ContextBudget {
  if (!partial) return DEFAULT_CONTEXT_BUDGET;
  return {
    maxContextTokens: partial.maxContextTokens ?? DEFAULT_CONTEXT_BUDGET.maxContextTokens,
    maxToolOutputChars: partial.maxToolOutputChars ?? DEFAULT_CONTEXT_BUDGET.maxToolOutputChars,
    maxSubagentOutputChars: partial.maxSubagentOutputChars ?? DEFAULT_CONTEXT_BUDGET.maxSubagentOutputChars,
    sanitizeLimitChars: partial.sanitizeLimitChars ?? DEFAULT_CONTEXT_BUDGET.sanitizeLimitChars,
    compactionThreshold: partial.compactionThreshold ?? DEFAULT_CONTEXT_BUDGET.compactionThreshold,
  };
}

/**
 * Build CompressorOptions-compatible fields from a budget.
 * Used by knowledge package consumers without importing knowledge into core.
 */
export function budgetToCompressorFields(budget: ContextBudget): {
  maxToolOutputLength: number;
  tokenBudget: number;
} {
  return {
    maxToolOutputLength: budget.maxToolOutputChars,
    tokenBudget: Math.floor(budget.maxContextTokens * budget.compactionThreshold),
  };
}
