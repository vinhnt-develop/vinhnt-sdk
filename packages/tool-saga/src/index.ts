/**
 * @module @vinhnt-sdk/tool-saga
 * Saga tracking for tool execution: record tool calls per step, register
 * compensating actions, and roll back steps (or the whole run) in reverse.
 */

export interface SagaEntry {
  toolId: string;
  toolName: string;
  input: unknown;
  output: unknown;
  timestamp: number;
  step: number;
}

export interface CompensationAction {
  entry: SagaEntry;
  compensate(): Promise<void>;
}

const COMPENSATION_TIMEOUT = 5_000;

export class ToolSaga {
  private readonly steps = new Map<number, SagaEntry[]>();
  private readonly compensations = new Map<string, CompensationAction>();
  private readonly rolledBack = new Set<string>();

  record(entry: SagaEntry): void {
    const entries = this.steps.get(entry.step) ?? [];
    entries.push(entry);
    this.steps.set(entry.step, entries);
  }

  registerCompensation(toolId: string, action: CompensationAction): void {
    this.compensations.set(toolId, action);
  }

  getEntries(step?: number): SagaEntry[] {
    if (step !== undefined) return this.steps.get(step) ?? [];
    const all: SagaEntry[] = [];
    const sorted = [...this.steps.keys()].sort((a, b) => b - a);
    for (const s of sorted) all.push(...(this.steps.get(s) ?? []));
    return all;
  }

  async rollbackStep(step: number): Promise<void> {
    const entries = this.steps.get(step);
    if (!entries) return;
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i]!;
      if (this.rolledBack.has(entry.toolId)) continue;
      const action = this.compensations.get(entry.toolId);
      if (action) {
        try {
          await Promise.race([
            action.compensate(),
            new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Compensation timed out")), COMPENSATION_TIMEOUT)),
          ]);
        } catch (err) {
          console.warn(`[saga] Compensation failed for ${entry.toolName}(${entry.toolId}):`, err);
        }
      }
      this.rolledBack.add(entry.toolId);
    }
    this.steps.delete(step);
  }

  async rollbackAll(): Promise<void> {
    const sorted = [...this.steps.keys()].sort((a, b) => b - a);
    for (const step of sorted) {
      await this.rollbackStep(step);
    }
  }

  clear(): void {
    this.steps.clear();
    this.compensations.clear();
    this.rolledBack.clear();
  }
}