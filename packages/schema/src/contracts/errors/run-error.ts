import { VntError } from "./base.js";
import type { RunId } from "../branded.js";

/** Thrown when a run id cannot be found in the store. */
export class RunNotFoundError extends VntError {
  public readonly code = "RUN_NOT_FOUND";
  public readonly retryable = false;

  constructor(public readonly runId: RunId) {
    super(`Run not found: ${runId}`);
    this.name = "RunNotFoundError";
  }
}

/** Thrown when a run is aborted. */
export class RunAbortedError extends VntError {
  public readonly code = "RUN_ABORTED";
  public readonly retryable = false;

  constructor(public readonly runId: RunId) {
    super(`Run aborted: ${runId}`);
    this.name = "RunAbortedError";
  }
}

/** Thrown when a run exceeds its timeout. */
export class RunTimeoutError extends VntError {
  public readonly code = "RUN_TIMEOUT";
  public readonly retryable = true;

  constructor(public readonly runId: RunId, public readonly timeoutMs: number) {
    super(`Run ${runId} timed out after ${timeoutMs}ms`);
    this.name = "RunTimeoutError";
  }
}
