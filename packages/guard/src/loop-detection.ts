/**
 * Loop detection — detects repeat tool calls with identical arguments.
 *
 * This is an advisory guard: it signals a doom loop but does not veto
 * execution. The caller decides whether to abort or log a warning.
 *
 * Extracted from step-executor kernel-utils for reuse across agents.
 */

/** Default consecutive identical calls that trigger doom-loop detection. */
export const DEFAULT_DOOM_LOOP_THRESHOLD = 3;

/** A recorded tool invocation used for doom-loop detection. */
export interface RecentCall {
  id: string;
  args: unknown;
  /** Canonical hash of `args` — precomputed once for O(1) doom-loop comparison */
  argsKey?: string;
}

/**
 * Stable, order-independent hash of an arbitrary tool-arguments value.
 * Object key order is normalized so `{a:1,b:2}` and `{b:2,a:1}` hash the same.
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

/**
 * Detect whether the same tool+args repeated the last `threshold` calls.
 *
 * @returns `true` if the last `threshold` calls are identical (doom loop detected)
 */
export function detectDoomLoop(
  recentCalls: RecentCall[],
  name: string,
  args: unknown,
  threshold = DEFAULT_DOOM_LOOP_THRESHOLD,
): boolean {
  if (recentCalls.length < threshold) return false;
  const last = recentCalls.slice(-threshold);
  const argsKey = hashArgs(args);
  return last.every((c) => c.id === name && (c.argsKey ?? hashArgs(c.args)) === argsKey);
}

/**
 * Stateful loop detector — tracks recent calls and detects doom loops.
 *
 * @example
 * ```ts
 * const detector = new LoopDetector(3);
 * detector.record("read_file", { path: "/etc/passwd" });
 * detector.record("read_file", { path: "/etc/passwd" });
 * detector.isDoomLoop("read_file", { path: "/etc/passwd" }); // true
 * ```
 */
export class LoopDetector {
  private readonly recentCalls: RecentCall[] = [];
  private readonly threshold: number;
  private readonly maxHistory: number;

  constructor(threshold = DEFAULT_DOOM_LOOP_THRESHOLD, maxHistory = 20) {
    this.threshold = threshold;
    this.maxHistory = maxHistory;
  }

  /** Record a tool invocation. */
  record(id: string, args: unknown): void {
    this.recentCalls.push({ id, args, argsKey: hashArgs(args) });
    if (this.recentCalls.length > this.maxHistory) {
      this.recentCalls.shift();
    }
  }

  /** Check if the given tool+args constitutes a doom loop. */
  isDoomLoop(id: string, args: unknown): boolean {
    return detectDoomLoop(this.recentCalls, id, args, this.threshold);
  }

  /** Get the recent call history (read-only copy). */
  getHistory(): readonly RecentCall[] {
    return [...this.recentCalls];
  }

  /** Reset the detector state. */
  reset(): void {
    this.recentCalls.length = 0;
  }
}
