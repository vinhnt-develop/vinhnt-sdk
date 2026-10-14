import type { PermissionMode } from "./permission.js";

/** Effect produced by the rule pipeline before the mode overlay runs. */
export type ModeEffect = "allow" | "ask" | "deny";

/**
 * Where the base effect came from:
 * - `rules` — an explicit permission rule / agent policy (user intent — only
 *   `bypass` lifts a rule `ask`, and no mode lifts a rule `deny`).
 * - `risk` — the risk-level default floor (read allow, write ask, destructive
 *   deny) — this is what the mode reshapes.
 */
export type ModeEffectSource = "rules" | "risk";

export interface PermissionModeInput {
  readonly mode: PermissionMode;
  readonly effect: ModeEffect;
  readonly source: ModeEffectSource;
  readonly toolName: string;
  /**
   * Risk of the tool. Typed as an open string because `ToolRisk` lives in
   * `@vinhnt-sdk/tools` and this package depends only on the schema.
   */
  readonly risk: string;
}

export interface PermissionModeDecision {
  readonly effect: ModeEffect;
  /** Replaces the pipeline reason when the overlay changes the effect. */
  readonly reason?: string;
  /** True when the overlay changed the base effect. */
  readonly overridden: boolean;
}

/**
 * Canonical mode families. Legacy P6.5 names are aliases:
 * `ask` ≡ `default`, `edit` ≡ `acceptEdits`, `full` ≡ `bypass`.
 * Unknown modes (open union) map to `default` — never widen access.
 */
function canonicalMode(mode: PermissionMode): "default" | "acceptEdits" | "plan" | "bypass" | "auto" {
  switch (mode) {
    case "edit":
    case "acceptEdits":
      return "acceptEdits";
    case "plan":
      return "plan";
    case "full":
    case "bypass":
      return "bypass";
    case "auto":
      return "auto";
    case "ask":
    case "default":
    default:
      return "default";
  }
}

/**
 * Apply a permission-mode overlay (G5, Claude-style modes) on top of the
 * effect the rule pipeline resolved. Pure and synchronous — the `auto`
 * classifier runs separately at the ask (`PermissionGate.askForTool`).
 *
 * Precedence: explicit rule `deny` always wins; `plan` hard-blocks mutating
 * risks; `bypass` lifts every prompt plus the risk-floor deny; `acceptEdits`
 * only lifts risk-floor `write` asks; `auto` escalates the risk-floor deny to
 * an ask so the classifier/dialog can decide.
 */
export function applyPermissionMode(input: PermissionModeInput): PermissionModeDecision {
  const passthrough: PermissionModeDecision = { effect: input.effect, overridden: false };

  switch (canonicalMode(input.mode)) {
    case "acceptEdits":
      if (input.effect === "ask" && input.source === "risk" && input.risk === "write") {
        return {
          effect: "allow",
          reason: `Auto-approved file edit ("acceptEdits" mode)`,
          overridden: true,
        };
      }
      return passthrough;

    case "bypass":
      if (input.effect === "ask") {
        return { effect: "allow", reason: `Auto-approved ("bypass" mode)`, overridden: true };
      }
      if (input.effect === "deny" && input.source === "risk") {
        return { effect: "allow", reason: `Risk floor lifted ("bypass" mode)`, overridden: true };
      }
      return passthrough;

    case "plan":
      if (input.risk === "write" || input.risk === "destructive") {
        if (input.effect === "deny") return passthrough;
        return {
          effect: "deny",
          reason: `Plan mode blocks "${input.risk}" tools ("${input.mode}")`,
          overridden: true,
        };
      }
      return passthrough;

    case "auto":
      // Escalate the risk-floor deny so the classifier/dialog can decide;
      // explicit rule denies stay denied (no mode lifts them).
      if (input.effect === "deny" && input.source === "risk") {
        return {
          effect: "ask",
          reason: `Escalated to approval ("auto" mode)`,
          overridden: true,
        };
      }
      return passthrough;

    case "default":
    default:
      return passthrough;
  }
}
