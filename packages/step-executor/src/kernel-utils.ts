import { RunAbortedError } from "@vinhnt-sdk/schema";
import type { RunId } from "@vinhnt-sdk/schema";

/** Race a promise against an abort signal — rejects with RunAbortedError if aborted */
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

export const DEFAULT_MAX_STEPS = 25;
export const DEFAULT_MAX_TOOL_CALLS_PER_STEP = 20;
export const DOOM_LOOP_THRESHOLD = 3;

export const SELF_CORRECT_PROMPT = `A tool call just failed. Analyze the error and try a corrected approach.

Guidelines:
- If the error is about arguments, fix the arguments and retry.
- If the tool is unavailable, suggest an alternative tool.
- If the problem is permanent (e.g., invalid request), explain to the user.
- Do NOT repeat the same failing call.`;

export interface RecentCall {
  id: string;
  args: unknown;
  /** Canonical hash of `args` — precomputed once for O(1) doom-loop comparison */
  argsKey?: string;
}

/**
 * Stable, order-independent hash of an arbitrary tool-arguments value.
 * Object key order is normalized so `{a:1,b:2}` and `{b:2,a:1}` hash the same,
 * and the hash is computed once per call (vs. repeated JSON.stringify in a
 * doom-loop scan). Collisions are possible but astronomically unlikely for the
 * small arg payloads agents produce.
 */
export function hashArgs(value: unknown): string {
  return fnv1a(canonicalJson(value)).toString(36);
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function detectDoomLoop(recentCalls: RecentCall[], name: string, args: unknown, threshold = DOOM_LOOP_THRESHOLD): boolean {
  if (recentCalls.length < threshold) return false;
  const last = recentCalls.slice(-threshold);
  const argsKey = hashArgs(args);
  return last.every((c) => c.id === name && (c.argsKey ?? hashArgs(c.args)) === argsKey);
}

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
