export type PermissionEffect = "allow" | "deny" | "ask" | (string & {});

/**
 * Approval mode for a run — the security vocabulary lives in the SDK so no
 * application owns it (P6.5 / research P7, modeled on Claude Agent SDK
 * permission modes; G5 completes the Claude-style set).
 *
 * Known modes (see {@link KNOWN_PERMISSION_MODES}):
 * - `default` — prompt before tool execution (fail-closed default)
 * - `acceptEdits` — auto-approve file edits (risk `write` asks from the risk
 *   floor); everything else still prompts. Alias: `edit` (P6.5).
 * - `plan` — read-only planning mode: `write`/`destructive` tools are denied
 *   even when rules allow them
 * - `bypass` — auto-approve all prompts; the risk-floor deny is lifted
 *   (explicit rule denies still win). Alias: `full` (P6.5).
 * - `auto` — every risk-floor ask is classified (`PermissionClassifier`,
 *   Claude-style); `allow` auto-proceeds, `ask` opens the dialog. Explicit
 *   rule `ask`s always open the dialog; explicit `deny`s always deny.
 * - `ask` — legacy alias of `default` (P6.5, kept for backward compatibility)
 *
 * Open union per the library-design rule (new modes ship without a breaking
 * type change); validation and UI lists must use KNOWN_PERMISSION_MODES.
 * Unknown mode strings behave like `default` (never widen access).
 */
export type PermissionMode = KnownPermissionMode | (string & {});

/** The modes the reference implementation understands (validation + UI lists). */
export const KNOWN_PERMISSION_MODES = [
  "default",
  "acceptEdits",
  "plan",
  "bypass",
  "auto",
  "ask",
  "edit",
  "full",
] as const;

/** Narrowed union of {@link KNOWN_PERMISSION_MODES}. */
export type KnownPermissionMode = (typeof KNOWN_PERMISSION_MODES)[number];

export interface PermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly effect: PermissionEffect;
  readonly paramPattern?: string | undefined;
  readonly metadata?: Record<string, unknown>;
}

export type PermissionRuleset = readonly PermissionRule[];