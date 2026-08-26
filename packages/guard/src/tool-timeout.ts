/**
 * Tool timeout — typed error and cooperative deadline utilities.
 *
 * Tool timeouts are enforced by the sandbox layer (via `withTimeoutAndAbort`).
 * This module provides the typed error and a helper for wrapping tool
 * execution with a cooperative deadline.
 */

import { VntError } from "@vinhnt-sdk/schema";

/** Thrown when a tool execution exceeds its timeout. */
export class ToolTimeoutError extends VntError {
  readonly toolId: string;
  readonly timeoutMs: number;

  constructor(toolId: string, timeoutMs: number) {
    super(`Tool "${toolId}" timed out after ${timeoutMs}ms`, { code: "TOOL_TIMEOUT", retryable: false });
    this.name = "ToolTimeoutError";
    this.toolId = toolId;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Execute a function with a cooperative deadline.
 *
 * If the deadline is exceeded, the function is aborted via the signal
 * and `ToolTimeoutError` is thrown.
 *
 * @param toolId - Tool identifier (for error messages)
 * @param timeoutMs - Maximum execution time in milliseconds
 * @param fn - The async function to execute (receives the AbortSignal)
 * @returns The result of the function
 * @throws ToolTimeoutError if the deadline is exceeded
 */
export async function withToolTimeout<T>(
  toolId: string,
  timeoutMs: number,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fn(controller.signal);
  } catch (err) {
    if (controller.signal.aborted) {
      // AbortError from our timeout → wrap in ToolTimeoutError
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ToolTimeoutError(toolId, timeoutMs);
      }
      throw err;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
