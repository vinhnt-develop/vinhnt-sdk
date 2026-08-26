import type { ChildProcess } from "node:child_process";
import { killProcessTree } from "./kill-tree.js";

/**
 * Attach timeout + abort handling to a child process.
 *
 * This is the shared pattern used by all sandbox backends (host, process,
 * container) to enforce execution timeouts and abort signals. It replaces
 * the duplicated `setTimeout` + `killProcessTree` + abort listener logic
 * that was previously copy-pasted across backends.
 *
 * RV-11: the timeout must kill the whole tree, not just the direct child.
 * `execFile`'s built-in `timeout` option only SIGTERMs the spawned pid,
 * orphaning grandchildren — so the timeout is handled here instead.
 *
 * @param child - The spawned child process
 * @param timeoutMs - Maximum execution time in milliseconds
 * @param signal - Optional abort signal
 * @param onAbort - Callback when timeout or abort fires (resolves the promise)
 *
 * @example
 * ```ts
 * const child = execFile(file, args, options, callback);
 * withTimeoutAndAbort(child, 30_000, signal, () => {
 *   resolve({ result: { stdout: "", stderr: "Aborted", exitCode: 1 }, exitCode: 1, durationMs: Date.now() - start, timedOut: false });
 * });
 * ```
 */
export function withTimeoutAndAbort(
  child: ChildProcess,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  onAbort: (reason: string) => void,
): { timedOut: boolean; clearTimer: () => void } {
  let timedOut = false;

  // RV-11: kill the whole tree, not just the direct child
  const timer = setTimeout(() => {
    timedOut = true;
    killProcessTree(child);
    onAbort("Aborted");
  }, timeoutMs);

  const clearTimer = () => clearTimeout(timer);
  child.once("exit", clearTimer);
  child.once("error", clearTimer);

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      killProcessTree(child);
      onAbort(signal.reason ?? "Aborted");
    } else {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        killProcessTree(child);
        onAbort(signal.reason ?? "Aborted");
      }, { once: true });
    }
  }

  return {
    get timedOut() { return timedOut; },
    clearTimer,
  } as { timedOut: boolean; clearTimer: () => void };
}
