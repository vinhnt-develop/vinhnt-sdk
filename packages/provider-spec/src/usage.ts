/**
 * Usage types for language model calls.
 *
 * Follows the industry-standard nested usage pattern (OpenAI, Vercel AI SDK, Mastra).
 */

/**
 * Detailed token usage from a language model call.
 *
 * Structure follows Vercel AI SDK's LanguageModelV4Usage pattern.
 */
export interface LanguageModelUsage {
  /** Input (prompt) tokens. */
  readonly inputTokens: {
    /** Total input tokens. */
    readonly total: number | undefined;
    /** Tokens not from cache. */
    readonly noCache: number | undefined;
    /** Tokens read from cache. */
    readonly cacheRead: number | undefined;
    /** Tokens written to cache. */
    readonly cacheWrite: number | undefined;
  };
  /** Output (completion) tokens. */
  readonly outputTokens: {
    /** Total output tokens. */
    readonly total: number | undefined;
    /** Text output tokens. */
    readonly text: number | undefined;
    /** Reasoning/thinking tokens. */
    readonly reasoning: number | undefined;
  };
  /** Total tokens (input + output). */
  readonly totalTokens: number | undefined;
  /** Provider-specific raw usage data. */
  readonly raw?: Record<string, unknown>;
}

/**
 * User-facing usage metrics (flattened for convenience).
 *
 * This is what agent run results expose to consumers.
 */
export interface RunUsage {
  /** Total number of steps (LLM calls) executed. */
  readonly totalSteps: number;
  /** Total duration in milliseconds. */
  readonly durationMs?: number;
  /** Input tokens used. */
  readonly inputTokens?: number;
  /** Output tokens used. */
  readonly outputTokens?: number;
  /** Reasoning/thinking tokens used. */
  readonly reasoningTokens?: number;
  /** Cache read tokens (prompt caching). */
  readonly cacheReadTokens?: number;
  /** Cache write tokens (prompt caching). */
  readonly cacheWriteTokens?: number;
  /** Total tokens (input + output + reasoning). */
  readonly totalTokens?: number;
  /** Total cost in USD. */
  readonly cost?: number;
  /** Number of tool calls executed. */
  readonly toolCallsCount?: number;
  /** Model used for this run. */
  readonly model?: string;
  /** Provider used for this run. */
  readonly provider?: string;
  /** Stop reason from the LLM. */
  readonly stopReason?: string;
  /** Provider-specific raw usage data. */
  readonly raw?: Record<string, unknown>;
}

/**
 * Aggregates two RunUsage objects (for multi-step runs).
 */
export function addRunUsage(a: RunUsage, b: RunUsage): RunUsage {
  const result: RunUsage = {
    totalSteps: a.totalSteps + b.totalSteps,
    durationMs: (a.durationMs ?? 0) + (b.durationMs ?? 0),
    inputTokens: (a.inputTokens ?? 0) + (b.inputTokens ?? 0),
    outputTokens: (a.outputTokens ?? 0) + (b.outputTokens ?? 0),
    reasoningTokens: (a.reasoningTokens ?? 0) + (b.reasoningTokens ?? 0),
    cacheReadTokens: (a.cacheReadTokens ?? 0) + (b.cacheReadTokens ?? 0),
    cacheWriteTokens: (a.cacheWriteTokens ?? 0) + (b.cacheWriteTokens ?? 0),
    totalTokens: (a.totalTokens ?? 0) + (b.totalTokens ?? 0),
    cost: (a.cost ?? 0) + (b.cost ?? 0),
    toolCallsCount: (a.toolCallsCount ?? 0) + (b.toolCallsCount ?? 0),
  };
  if (b.model !== undefined || a.model !== undefined) {
    const model = b.model ?? a.model;
    if (model !== undefined) (result as { model: string }).model = model;
  }
  if (b.provider !== undefined || a.provider !== undefined) {
    const provider = b.provider ?? a.provider;
    if (provider !== undefined) (result as { provider: string }).provider = provider;
  }
  if (a.raw !== undefined || b.raw !== undefined) {
    (result as { raw?: Record<string, unknown> }).raw = { ...a.raw, ...b.raw };
  }
  return result;
}

/**
 * Type for usage aggregation functions.
 */
export type UsageAggregator = (a: RunUsage, b: RunUsage) => RunUsage;
