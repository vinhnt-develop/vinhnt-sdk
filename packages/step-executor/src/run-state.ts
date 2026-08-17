import type { RunId } from "@vinhnt-sdk/schema";

/** Lifecycle state of a run. */
export type RunState = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";

/** Tracks per-run state, abort signals and input queues. */
export class RunStateMachine {
  private readonly runStates = new Map<RunId, RunState>();
  private readonly runAborts = new Map<RunId, AbortController>();
  private readonly pendingInputs = new Map<RunId, string[]>();
  private readonly busySessions = new Set<string>();
  private readonly modelForRun = new Map<RunId, unknown>();
  private readonly stateSubscribers = new Set<(runId: RunId, state: RunState) => void>();
  readonly runIdStack: RunId[] = [];

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
    const abort = new AbortController();
    this.runAborts.set(runId, abort);
    this.setState(runId, "pending");

    if (sessionId) {
      // Parallel sub-agent runs bypass the session busy check
      if (parentRunId && this.runAborts.has(parentRunId)) {
        // Child run — skip busy check, child shares parent session
      } else if (this.busySessions.has(sessionId)) {
        this.runAborts.delete(runId);
        return null;
      } else {
        this.busySessions.add(sessionId);
      }
    }

    return abort;
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
    this.runStates.delete(runId);
    this.pendingInputs.delete(runId);
    this.modelForRun.delete(runId);
    if (sessionId) this.busySessions.delete(sessionId);
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
