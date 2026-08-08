import type { EventBus } from "@vinhnt-sdk/core";

export interface CostEntry {
  readonly runId: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cost: number;
  readonly timestamp: Date;
  readonly step?: number;
  readonly sessionId?: string;
}

export interface CostSummary {
  readonly totalCost: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly byModel: Record<string, { cost: number; inputTokens: number; outputTokens: number; calls: number }>;
  readonly bySession: Record<string, { cost: number; calls: number }>;
}

export interface CostTrackerConfig {
  readonly eventBus: EventBus;
  readonly maxEntries?: number;
}

export class CostTracker {
  private readonly entries: CostEntry[] = [];
  private readonly maxEntries: number;
  private readonly unsubscribe: () => void;

  constructor(config: CostTrackerConfig) {
    this.maxEntries = config.maxEntries ?? 10_000;

    this.unsubscribe = config.eventBus.subscribeAll((event) => {
      if (event.type === "model.cost") {
        const data = event.data as {
          model: string;
          inputTokens: number;
          outputTokens: number;
          cost: number;
          step?: number;
        };
        const runId = (event as { runId?: string }).runId ?? "";
        this.addEntry({
          runId,
          model: data.model,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          cost: data.cost,
          timestamp: new Date(event.occurredAt),
          step: data.step,
        });
      }
    });
  }

  addEntry(entry: CostEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  getEntries(filter?: { runId?: string; sessionId?: string; model?: string }): CostEntry[] {
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
    return result;
  }

  getSummary(filter?: { runId?: string; sessionId?: string }): CostSummary {
    const entries = this.getEntries(filter);
    const byModel: Record<string, { cost: number; inputTokens: number; outputTokens: number; calls: number }> = {};
    const bySession: Record<string, { cost: number; calls: number }> = {};

    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const entry of entries) {
      totalCost += entry.cost;
      totalInputTokens += entry.inputTokens;
      totalOutputTokens += entry.outputTokens;

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
    }

    return {
      totalCost: Number(totalCost.toFixed(6)),
      totalInputTokens,
      totalOutputTokens,
      byModel,
      bySession,
    };
  }

  dispose(): void {
    this.unsubscribe();
    this.entries.length = 0;
  }
}
