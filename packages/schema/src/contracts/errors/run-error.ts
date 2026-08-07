import { VntError } from "./base.js";
import type { RunId } from "../branded.js";

export class RunNotFoundError extends VntError {
  constructor(public readonly runId: RunId) {
    super(`Run not found: ${runId}`);
    this.name = "RunNotFoundError";
  }
}

export class RunAbortedError extends VntError {
  constructor(public readonly runId: RunId) {
    super(`Run aborted: ${runId}`);
    this.name = "RunAbortedError";
  }
}

export class RunTimeoutError extends VntError {
  constructor(public readonly runId: RunId, public readonly timeoutMs: number) {
    super(`Run ${runId} timed out after ${timeoutMs}ms`);
    this.name = "RunTimeoutError";
  }
}
