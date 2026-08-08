import type { EventBus } from "@vinhnt-sdk/core";

// ---------------------------------------------------------------------------
// Model Pricing Table (2026 rates)
// ---------------------------------------------------------------------------

/** Pricing per 1M tokens (USD) */
export interface ModelPricing {
  input: number;
  output: number;
  reasoning?: number;
}

/** Default pricing table for popular models (2026) */
export const DEFAULT_PRICING_TABLE: Record<string, ModelPricing> = {
  // OpenAI models
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
  "gpt-4": { input: 30.00, output: 60.00 },
  "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
  "o1": { input: 15.00, output: 60.00, reasoning: 60.00 },
  "o1-mini": { input: 3.00, output: 12.00, reasoning: 12.00 },
  "o3": { input: 10.00, output: 40.00, reasoning: 40.00 },
  "o3-mini": { input: 1.10, output: 4.40, reasoning: 4.40 },
  "o4-mini": { input: 1.10, output: 4.40, reasoning: 4.40 },

  // Anthropic models
  "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
  "claude-3-5-haiku-20241022": { input: 0.80, output: 4.00 },
  "claude-3-opus-20240229": { input: 15.00, output: 75.00 },
  "claude-3-sonnet-20240229": { input: 3.00, output: 15.00 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "claude-opus-4-20250514": { input: 15.00, output: 75.00 },
  "claude-sonnet-4-20250514": { input: 3.00, output: 15.00 },

  // Google models
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.30 },
  "gemini-1.5-pro": { input: 1.25, output: 5.00 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },

  // Embedding models (per 1M tokens)
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
  "voyage-code-3": { input: 0.18, output: 0 },
};

// ---------------------------------------------------------------------------
// Budget Configuration
// ---------------------------------------------------------------------------

/** Budget limit configuration */
export interface BudgetConfig {
  /** Budget type */
  type: "user" | "session" | "tenant" | "global";
  /** ID for the budget (user ID, session ID, tenant ID) */
  id: string;
  /** Soft limit in USD (warn when exceeded) */
  softLimit: number;
  /** Hard limit in USD (reject/queue when exceeded) */
  hardLimit: number;
  /** Time window for the budget */
  window: "hour" | "day" | "month";
}

/** Budget status */
export interface BudgetStatus {
  config: BudgetConfig;
  currentSpend: number;
  softLimitExceeded: boolean;
  hardLimitExceeded: boolean;
  /** Time until budget resets (ms) */
  resetInMs: number;
}

// ---------------------------------------------------------------------------
// Cost Entry
// ---------------------------------------------------------------------------

export interface CostEntry {
  readonly runId: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens?: number;
  readonly cost: number;
  readonly timestamp: Date;
  readonly step?: number;
  readonly sessionId?: string;
  readonly userId?: string;
  readonly tenantId?: string;
}

export interface CostSummary {
  readonly totalCost: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalReasoningTokens: number;
  readonly byModel: Record<string, { cost: number; inputTokens: number; outputTokens: number; calls: number }>;
  readonly bySession: Record<string, { cost: number; calls: number }>;
  readonly byUser: Record<string, { cost: number; calls: number }>;
}

export interface CostTrackerConfig {
  readonly eventBus: EventBus;
  readonly maxEntries?: number;
  /** Custom pricing table (overrides defaults) */
  readonly pricingTable?: Record<string, ModelPricing>;
  /** Budget limits */
  readonly budgets?: BudgetConfig[];
  /** Emit warnings when soft limit exceeded */
  readonly emitWarnings?: boolean;
}

export class CostTracker {
  private readonly entries: CostEntry[] = [];
  private readonly maxEntries: number;
  private readonly pricingTable: Record<string, ModelPricing>;
  private readonly budgets: BudgetConfig[];
  private readonly emitWarnings: boolean;
  private readonly unsubscribe: () => void;

  constructor(config: CostTrackerConfig) {
    this.maxEntries = config.maxEntries ?? 10_000;
    this.pricingTable = { ...DEFAULT_PRICING_TABLE, ...config.pricingTable };
    this.budgets = config.budgets ?? [];
    this.emitWarnings = config.emitWarnings ?? true;

    this.unsubscribe = config.eventBus.subscribeAll((event) => {
      if (event.type === "model.cost") {
        const data = event.data as {
          model: string;
          inputTokens: number;
          outputTokens: number;
          reasoningTokens?: number;
          cost: number;
          step?: number;
        };
        const runId = (event as { runId?: string }).runId ?? "";
        const sessionId = (event as { sessionId?: string }).sessionId ?? "";
        const userId = (event as { userId?: string }).userId ?? "";
        const tenantId = (event as { tenantId?: string }).tenantId ?? "";

        this.addEntry({
          runId,
          model: data.model,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          reasoningTokens: data.reasoningTokens,
          cost: data.cost,
          timestamp: new Date(event.occurredAt),
          step: data.step,
          sessionId,
          userId,
          tenantId,
        });
      }
    });
  }

  /**
   * Calculate cost from token counts using pricing table.
   */
  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    reasoningTokens?: number,
  ): number {
    const pricing = this.pricingTable[model];
    if (!pricing) {
      // Default fallback: assume $3/1M input, $15/1M output
      return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
    }

    let cost = (inputTokens * pricing.input) / 1_000_000;
    cost += (outputTokens * pricing.output) / 1_000_000;

    if (reasoningTokens && pricing.reasoning) {
      cost += (reasoningTokens * pricing.reasoning) / 1_000_000;
    }

    return cost;
  }

  addEntry(entry: CostEntry): void {
    // Check budget limits before adding
    const budgetStatus = this.checkBudgets(entry);
    if (budgetStatus) {
      if (budgetStatus.hardLimitExceeded) {
        // Log warning but still add the entry (for tracking)
        if (this.emitWarnings) {
          console.warn(
            `[CostTracker] Hard budget limit exceeded for ${budgetStatus.config.type}:${budgetStatus.config.id}`,
            `Current: $${budgetStatus.currentSpend.toFixed(2)}, Limit: $${budgetStatus.config.hardLimit}`,
          );
        }
      } else if (budgetStatus.softLimitExceeded) {
        if (this.emitWarnings) {
          console.warn(
            `[CostTracker] Soft budget limit exceeded for ${budgetStatus.config.type}:${budgetStatus.config.id}`,
            `Current: $${budgetStatus.currentSpend.toFixed(2)}, Limit: $${budgetStatus.config.softLimit}`,
          );
        }
      }
    }

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  getEntries(filter?: { runId?: string; sessionId?: string; model?: string; userId?: string }): CostEntry[] {
    let result = this.entries;
    if (filter?.runId) {
      result = result.filter((e) => e.runId === filter.runId);
    }
    if (filter?.sessionId) {
      result = result.filter((e) => e.sessionId === filter.sessionId);
    }
    if (filter?.model) {
      result = result.filter((e) => e.model === filter.model);
    }
    if (filter?.userId) {
      result = result.filter((e) => e.userId === filter.userId);
    }
    return result;
  }

  getSummary(filter?: { runId?: string; sessionId?: string; userId?: string }): CostSummary {
    const entries = this.getEntries(filter);
    const byModel: Record<string, { cost: number; inputTokens: number; outputTokens: number; calls: number }> = {};
    const bySession: Record<string, { cost: number; calls: number }> = {};
    const byUser: Record<string, { cost: number; calls: number }> = {};

    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalReasoningTokens = 0;

    for (const entry of entries) {
      totalCost += entry.cost;
      totalInputTokens += entry.inputTokens;
      totalOutputTokens += entry.outputTokens;
      totalReasoningTokens += entry.reasoningTokens ?? 0;

      const modelEntry = byModel[entry.model];
      if (modelEntry) {
        modelEntry.cost += entry.cost;
        modelEntry.inputTokens += entry.inputTokens;
        modelEntry.outputTokens += entry.outputTokens;
        modelEntry.calls++;
      } else {
        byModel[entry.model] = {
          cost: entry.cost,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
          calls: 1,
        };
      }

      if (entry.sessionId) {
        const sessionEntry = bySession[entry.sessionId];
        if (sessionEntry) {
          sessionEntry.cost += entry.cost;
          sessionEntry.calls++;
        } else {
          bySession[entry.sessionId] = { cost: entry.cost, calls: 1 };
        }
      }

      if (entry.userId) {
        const userEntry = byUser[entry.userId];
        if (userEntry) {
          userEntry.cost += entry.cost;
          userEntry.calls++;
        } else {
          byUser[entry.userId] = { cost: entry.cost, calls: 1 };
        }
      }
    }

    return {
      totalCost: Number(totalCost.toFixed(6)),
      totalInputTokens,
      totalOutputTokens,
      totalReasoningTokens,
      byModel,
      bySession,
      byUser,
    };
  }

  /**
   * Check budget limits for a cost entry.
   */
  checkBudgets(entry: CostEntry): { config: BudgetConfig; currentSpend: number; softLimitExceeded: boolean; hardLimitExceeded: boolean; resetInMs: number } | null {
    for (const budget of this.budgets) {
      let matches = false;

      switch (budget.type) {
        case "user":
          matches = entry.userId === budget.id;
          break;
        case "session":
          matches = entry.sessionId === budget.id;
          break;
        case "tenant":
          matches = entry.tenantId === budget.id;
          break;
        case "global":
          matches = true;
          break;
      }

      if (matches) {
        const spend = this.calculateBudgetSpend(budget, entry.timestamp);
        return {
          config: budget,
          currentSpend: spend,
          softLimitExceeded: spend > budget.softLimit,
          hardLimitExceeded: spend > budget.hardLimit,
          resetInMs: this.calculateResetTime(budget, entry.timestamp),
        };
      }
    }

    return null;
  }

  /**
   * Calculate spend within a budget window.
   */
  private calculateBudgetSpend(budget: BudgetConfig, now: Date): number {
    const windowMs = this.getWindowMs(budget.window);
    const windowStart = new Date(now.getTime() - windowMs);

    return this.entries
      .filter((e) => e.timestamp >= windowStart)
      .filter((e) => {
        switch (budget.type) {
          case "user": return e.userId === budget.id;
          case "session": return e.sessionId === budget.id;
          case "tenant": return e.tenantId === budget.id;
          case "global": return true;
        }
      })
      .reduce((sum, e) => sum + e.cost, 0);
  }

  /**
   * Calculate time until budget resets.
   */
  private calculateResetTime(budget: BudgetConfig, now: Date): number {
    const windowMs = this.getWindowMs(budget.window);
    const windowStart = new Date(now.getTime() - windowMs);

    // Find the oldest entry in the window
    const oldestEntry = this.entries
      .filter((e) => e.timestamp >= windowStart)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];

    if (!oldestEntry) {
      return windowMs;
    }

    const resetTime = oldestEntry.timestamp.getTime() + windowMs;
    return Math.max(0, resetTime - now.getTime());
  }

  private getWindowMs(window: "hour" | "day" | "month"): number {
    switch (window) {
      case "hour": return 60 * 60 * 1000;
      case "day": return 24 * 60 * 60 * 1000;
      case "month": return 30 * 24 * 60 * 60 * 1000;
    }
  }

  dispose(): void {
    this.unsubscribe();
    this.entries.length = 0;
  }
}
