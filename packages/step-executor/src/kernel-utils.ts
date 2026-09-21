import { RunAbortedError } from "@vinhnt-sdk/schema";
import type { RunId } from "@vinhnt-sdk/schema";
import { DEFAULT_DOOM_LOOP_THRESHOLD } from "@vinhnt-sdk/guard";

// Re-export canonical implementations from guard to avoid duplication.
export type { RecentCall } from "@vinhnt-sdk/guard";
export { hashArgs, detectDoomLoop, DEFAULT_DOOM_LOOP_THRESHOLD } from "@vinhnt-sdk/guard";

/** Race a promise against an abort signal — rejects with RunAbortedError if aborted. @internal */
export function raceWithAbort<T>(promise: Promise<T>, signal: AbortSignal, runId: RunId): Promise<T> {
  if (signal.aborted) return Promise.reject(new RunAbortedError(runId));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new RunAbortedError(runId));
    };
    signal.addEventListener("abort", onAbort);
    promise.then(
      (v) => { signal.removeEventListener("abort", onAbort); resolve(v); },
      (e) => { signal.removeEventListener("abort", onAbort); reject(e); },
    );
  });
}

/**
 * Run a tool execution with a cooperative timeout (RV-19). The caller's
 * `run` receives a local `AbortSignal` that fires when EITHER the parent
 * (run) signal aborts OR the tool exceeds `timeoutMs`. Well-behaved tools
 * that watch their context signal stop their side effects at the deadline
 * instead of continuing past it (a plain `Promise.race` abandons the tool
 * promise and its effects keep running). The returned promise still
 * hard-rejects at `timeoutMs`, so a non-cooperative tool can never hang the
 * caller longer than the deadline. Parent aborts are NOT synthesised here —
 * the caller's `raceWithAbort` rejects with `RunAbortedError`.
 * @internal
 */
export function withToolTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parent: AbortSignal,
  timeoutMessage: string,
): Promise<T> {
  const ctrl = new AbortController();
  const onParentAbort = () => ctrl.abort(parent.reason);
  if (parent.aborted) {
    ctrl.abort(parent.reason);
  } else {
    parent.addEventListener("abort", onParentAbort, { once: true });
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      ctrl.abort(new Error(timeoutMessage));
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    run(ctrl.signal).then(
      (v) => {
        clearTimeout(timer);
        parent.removeEventListener("abort", onParentAbort);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        parent.removeEventListener("abort", onParentAbort);
        reject(e);
      },
    );
  });
}

/** Default cap on steps per run. */
export const DEFAULT_MAX_STEPS = 25;
/** Default cap on tool calls per step. */
export const DEFAULT_MAX_TOOL_CALLS_PER_STEP = 20;
/** Consecutive identical calls that trigger doom-loop detection. */
export const DOOM_LOOP_THRESHOLD = DEFAULT_DOOM_LOOP_THRESHOLD;

/** System prompt guiding the model to correct a failed tool call. @internal */
export const SELF_CORRECT_PROMPT = `A tool call just failed. Analyze the error and try a corrected approach.

Guidelines:
- If the error is about arguments, fix the arguments and retry.
- If the tool is unavailable, suggest an alternative tool.
- If the problem is permanent (e.g., invalid request), explain to the user.
- Do NOT repeat the same failing call.`;

/**
 * Derive the owning domain from a namespaced tool id:
 * `mcp__<server>__<tool>` → "mcp:<server>", `coding.read_file` → "coding",
 * bare ids → "core".
 */
export function toolDomain(toolName: string): string {
  if (toolName.startsWith("mcp__")) {
    const parts = toolName.split("__");
    return parts.length >= 2 ? `mcp:${parts[1]!}` : "mcp";
  }
  const dot = toolName.indexOf(".");
  return dot > 0 ? toolName.slice(0, dot) : "core";
}
