import type { RunId } from "@vinhnt-sdk/schema";

/** Lifecycle state of a run. */
export type RunState = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";

/**
 * Default number of cleaned-up run states kept for post-mortem inspection.
 *
 * `runStates` is the ONE map `cleanupRun()` deliberately keeps (UI / getRunState
 * still report how a run finished), so it is bounded FIFO instead of growing
 * forever — P5.10 eviction.
 */
export const MAX_RETAINED_RUN_STATES = 1000;

/** Tuning for {@link RunStateMachine}. */
export interface RunStateMachineOptions {
  /** Retained cleaned-up run states (default {@link MAX_RETAINED_RUN_STATES}). */
  readonly retainedTerminalStates?: number;
}

/** Tracks per-run state, abort signals and input queues. */
export class RunStateMachine {
  private readonly runStates = new Map<RunId, RunState>();
  private readonly runAborts = new Map<RunId, AbortController>();
  private readonly pendingInputs = new Map<RunId, string[]>();
  private readonly busySessions = new Set<string>();
  private readonly modelForRun = new Map<RunId, unknown>();
  private readonly stateSubscribers = new Set<(runId: RunId, state: RunState) => void>();
  /** Cleanup order of finished runs — head = next eviction candidate (FIFO). */
  private readonly retiredRuns: RunId[] = [];
  private readonly retainedStates: number;
  readonly runIdStack: RunId[] = [];

  constructor(options: RunStateMachineOptions = {}) {
    this.retainedStates = options.retainedTerminalStates ?? MAX_RETAINED_RUN_STATES;
  }

  getState(runId: RunId): RunState | undefined {
    return this.runStates.get(runId);
  }

  setState(runId: RunId, state: RunState): void {
    this.runStates.set(runId, state);
    for (const sub of this.stateSubscribers) {
      try { sub(runId, state); } catch { }
    }
  }

  onStateChange(listener: (runId: RunId, state: RunState) => void): () => void {
    this.stateSubscribers.add(listener);
    return () => { this.stateSubscribers.delete(listener); };
  }

  createRun(runId: RunId, sessionId?: string, parentRunId?: RunId): AbortController | null {
    // A re-created run is live again — un-retire it so its state is not
    // treated as an eviction candidate by the FIFO below.
    const retiredIndex = this.retiredRuns.indexOf(runId);
    if (retiredIndex !== -1) this.retiredRuns.splice(retiredIndex, 1);

    const abort = new AbortController();
    this.runAborts.set(runId, abort);
    this.setState(runId, "pending");

    if (sessionId) {
      // Parallel sub-agent runs bypass the session busy check
      if (parentRunId && this.runAborts.has(parentRunId)) {
        // Child run — skip busy check, child shares parent session
      } else if (this.busySessions.has(sessionId)) {
        this.runAborts.delete(runId);
        // Rejected run: its "pending" state would otherwise sit in runStates
        // forever — retire it so the FIFO can evict it too.
        this.retire(runId);
        return null;
      } else {
        this.busySessions.add(sessionId);
      }
    }

    return abort;
  }

  /**
   * Remove a run's entry from the run stack BY IDENTITY.
   *
   * Unlike a plain `pop()`, this only removes the given run — a concurrent
   * sibling that happens to sit on top of the stack is never discarded
   * (S3: blind `pop()` corrupted the stack when runs finished out of order).
   */
  exitRun(runId: RunId): void {
    const index = this.runIdStack.lastIndexOf(runId);
    if (index !== -1) this.runIdStack.splice(index, 1);
  }

  /** True while the run still has a live abort controller (not finished/cleaned up). */
  isActiveRun(runId: RunId): boolean {
    return this.runAborts.has(runId);
  }

  getAbort(runId: RunId): AbortController | undefined {
    return this.runAborts.get(runId);
  }

  isAborted(runId: RunId): boolean {
    return this.runAborts.get(runId)?.signal.aborted ?? false;
  }

  getSignal(runId: RunId): AbortSignal {
    return this.runAborts.get(runId)?.signal ?? new AbortController().signal;
  }

  cleanupRun(runId: RunId, sessionId?: string): void {
    this.runAborts.delete(runId);
    this.pendingInputs.delete(runId);
    this.modelForRun.delete(runId);
    if (sessionId) this.busySessions.delete(sessionId);
    // Keep the terminal run state so post-mortem getRunState()/UI can still
    // report how the run finished; only volatile resources are freed above.
    // Retention is bounded by the retire() FIFO below.
    this.retire(runId);
  }

  /**
   * Mark a finished/rejected run as post-mortem-only state and enforce the
   * retention bound (FIFO: oldest cleaned-up run loses its state first).
   *
   * Active runs are never evicted — a run re-created after cleanup was
   * un-retired by createRun() and skipped here as a safety net.
   */
  private retire(runId: RunId): void {
    if (!this.retiredRuns.includes(runId)) this.retiredRuns.push(runId);

    while (this.retiredRuns.length > this.retainedStates) {
      const oldest = this.retiredRuns.shift();
      if (oldest === undefined) break;
      if (this.isActiveRun(oldest)) continue;
      this.runStates.delete(oldest);
    }
  }

  cancelAll(): void {
    for (const a of this.runAborts.values()) a.abort();
  }

  sendInput(runId: RunId, text: string): void {
    const queue = this.pendingInputs.get(runId);
    if (queue) {
      queue.push(text);
    } else {
      this.pendingInputs.set(runId, [text]);
    }
  }

  drainInputs(runId: RunId): string[] {
    const queue = this.pendingInputs.get(runId);
    this.pendingInputs.delete(runId);
    return queue ?? [];
  }

  setModelForRun(runId: RunId, model: unknown): void {
    this.modelForRun.set(runId, model);
  }

  getModelForRun<T>(runId: RunId): T | undefined {
    return this.modelForRun.get(runId) as T | undefined;
  }

}
