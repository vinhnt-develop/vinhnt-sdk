import type { ModeEffectSource } from "./mode.js";

/** Classification result: `allow` auto-proceeds, `ask` opens the dialog. */
export type PermissionClassification = "allow" | "ask";

export interface PermissionClassifierInput {
  readonly toolName: string;
  /** Risk of the tool; undefined when the caller could not supply one. */
  readonly risk?: string | undefined;
  readonly args?: Record<string, unknown> | undefined;
  /** Whether the ask came from an explicit rule or the risk floor. */
  readonly source?: ModeEffectSource | undefined;
}

/**
 * Classifies an approval-worthy tool call before the dialog opens (G5,
 * Claude-style `auto` mode). The gate only consults it for risk-floor asks —
 * explicit rule `ask`s always surface the dialog.
 */
export interface PermissionClassifier {
  classify(input: PermissionClassifierInput): Promise<PermissionClassification>;
}

/**
 * Default classifier for `auto` mode: risk-based and fail-closed — unknown or
 * missing risk always asks. Pure and deterministic (reads/writes auto-proceed,
 * network/destructive prompt) so runs stay reproducible; inject a model-backed
 * classifier via {@link createCallbackPermissionClassifier} for Claude-style
 * semantic classification.
 */
export function createRiskPermissionClassifier(): PermissionClassifier {
  return {
    async classify(input: PermissionClassifierInput): Promise<PermissionClassification> {
      switch (input.risk) {
        case "read":
        case "write":
          return "allow";
        case "external":
        case "destructive":
          return "ask";
        default:
          return "ask";
      }
    },
  };
}

/**
 * Wrap an application classifier (e.g. an LLM-backed safety classifier) as a
 * {@link PermissionClassifier}. Rejections from the callback are caught by the
 * gate and fail closed to the approval dialog.
 */
export function createCallbackPermissionClassifier(
  classify: (input: PermissionClassifierInput) => Promise<PermissionClassification>,
): PermissionClassifier {
  return { classify };
}
