import { DEFAULT_DOOM_LOOP_THRESHOLD } from "@vinhnt-sdk/guard";

/**
 * What to do when a doom loop is detected (P1-3 / G14).
 *
 * - `ask` (default) — open a permission request (rule key `doom_loop`);
 *   once/allow continues, reject stops the batch. Respected even under
 *   auto-approval unless the user explicitly selects `allow`.
 * - `stop` — abort the batch (legacy hard-stop).
 * - `inject-hint` — fail this call with a model-visible doom_loop envelope
 *   and continue the batch (no abort).
 * - `allow` — disable detection for this scope (legacy escape hatch).
 */
export type LoopDetectionAction = "ask" | "stop" | "inject-hint" | "allow";

/**
 * Configurable doom-loop detection policy (config-driven, not hard-coded).
 *
 * @example
 * ```ts
 * loopDetection: {
 *   enabled: true,
 *   threshold: 3,
 *   action: "ask",
 *   perTool: { web_search: 5, delete_file: { threshold: 2, action: "stop" } },
 * }
 * ```
 */
export interface LoopDetectionConfig {
  /** Master switch. Default: true. `false` skips all doom-loop checks. */
  readonly enabled?: boolean;
  /** Identical consecutive calls that trigger detection. Default: 3. */
  readonly threshold?: number;
  /** Policy when detection fires. Default: `"ask"`. */
  readonly action?: LoopDetectionAction;
  /** Per-tool override: bare threshold number or `{ threshold, action }`. */
  readonly perTool?: Readonly<Record<string, number | {
    readonly threshold?: number;
    readonly action?: LoopDetectionAction;
  }>>;
}

/** Resolved per-tool loop policy used by the step executor. */
export interface ResolvedLoopPolicy {
  readonly enabled: boolean;
  readonly threshold: number;
  readonly action: LoopDetectionAction;
}

/**
 * Resolve the effective loop-detection policy for a tool.
 * Falls back to `defaultThreshold` (legacy `doomLoopThreshold` dep) when
 * `config.threshold` is omitted.
 */
export function resolveLoopPolicy(
  config: LoopDetectionConfig | undefined,
  toolName: string,
  defaultThreshold: number = DEFAULT_DOOM_LOOP_THRESHOLD,
): ResolvedLoopPolicy {
  const enabled = config?.enabled !== false;
  const baseThreshold = config?.threshold ?? defaultThreshold;
  const baseAction: LoopDetectionAction = config?.action ?? "ask";

  const per = config?.perTool?.[toolName];
  if (per === undefined) {
    return { enabled, threshold: baseThreshold, action: baseAction };
  }
  if (typeof per === "number") {
    return { enabled, threshold: per, action: baseAction };
  }
  return {
    enabled,
    threshold: per.threshold ?? baseThreshold,
    action: per.action ?? baseAction,
  };
}
