/**
 * Telemetry — usage aggregation, cost tracking, context pressure monitoring.
 *
 * Aggregates usage per session/provider/model and tracks token costs.
 */

/** Usage statistics for a single operation */
export interface UsageStats {
  /** Input tokens consumed */
  inputTokens: number;
  /** Output tokens generated */
  outputTokens: number;
  /** Total tokens (input + output) */
  totalTokens: number;
  /** Estimated cost in USD */
  costUsd: number;
}

/** Model pricing per 1M tokens (USD) */
export interface ModelPricing {
  /** Cost per 1M input tokens */
  inputPer1M: number;
  /** Cost per 1M output tokens */
  outputPer1M: number;
}

/** Default pricing — zero cost (override with actual pricing) */
const DEFAULT_PRICING: ModelPricing = {
  inputPer1M: 0,
  outputPer1M: 0,
};

/** Known model pricing (as of 2026) */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  "deepseek-chat": { inputPer1M: 0.27, outputPer1M: 1.10 },
  "deepseek-reasoner": { inputPer1M: 0.55, outputPer1M: 2.19 },
  "gpt-4o": { inputPer1M: 2.50, outputPer1M: 10.00 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "claude-sonnet-4-20250514": { inputPer1M: 3.00, outputPer1M: 15.00 },
  "claude-haiku-4-20250414": { inputPer1M: 0.80, outputPer1M: 4.00 },
};

/**
 * Calculate cost from token counts.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing = DEFAULT_PRICING,
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

/**
 * Cost meter — tracks token usage and cost across operations.
 * Named differently from llm/TokenMeter to clarify purpose:
 * - llm/TokenMeter: heuristic token estimation for request sizing
 * - trace/CostMeter: actual usage tracking and cost aggregation
 */
export class CostMeter {
  private totalInput = 0;
  private totalOutput = 0;
  private readonly operations: UsageStats[] = [];

  /** Record a token usage event */
  record(inputTokens: number, outputTokens: number, modelId?: string): UsageStats {
    const pricing = modelId ? MODEL_PRICING[modelId] : undefined;
    const costUsd = calculateCost(inputTokens, outputTokens, pricing);
    const stats: UsageStats = {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costUsd,
    };
    this.totalInput += inputTokens;
    this.totalOutput += outputTokens;
    this.operations.push(stats);
    return stats;
  }

  /** Get total usage */
  getTotal(): UsageStats {
    const totalCost = this.operations.reduce((sum, op) => sum + op.costUsd, 0);
    return {
      inputTokens: this.totalInput,
      outputTokens: this.totalOutput,
      totalTokens: this.totalInput + this.totalOutput,
      costUsd: totalCost,
    };
  }

  /** Get operation count */
  getOperationCount(): number {
    return this.operations.length;
  }

  /** Get all operation stats */
  getOperations(): readonly UsageStats[] {
    return [...this.operations];
  }

  /** Reset the meter */
  reset(): void {
    this.totalInput = 0;
    this.totalOutput = 0;
    this.operations.length = 0;
  }
}

/**
 * Context pressure — monitors context window usage.
 */
export interface ContextPressure {
  /** Current context tokens */
  currentTokens: number;
  /** Maximum context window */
  maxTokens: number;
  /** Pressure ratio (0.0 = empty, 1.0 = full) */
  pressure: number;
  /** Whether compaction is recommended */
  shouldCompact: boolean;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Calculate context pressure.
 */
export function calculateContextPressure(
  currentTokens: number,
  maxTokens: number,
  compactThreshold = 0.8,
): ContextPressure {
  const pressure = maxTokens > 0 ? currentTokens / maxTokens : 0;
  return {
    currentTokens,
    maxTokens,
    pressure,
    shouldCompact: pressure >= compactThreshold,
  };
}
