/**
 * Stable RespondToModel format for tool failures (P1-4 / G15).
 *
 * Every model-visible tool failure should return a predictable
 * `{ ok:false, error, hint? }` payload so the model can self-correct
 * instead of receiving raw exception dumps or empty strings.
 *
 * @module contracts/errors/respond-to-model
 */

/** Shape of a model-visible tool failure result. */
export interface ToolFailureResult {
  readonly ok: false;
  /** Short machine-readable error message. */
  readonly error: string;
  /** Optional actionable hint for the model. */
  readonly hint?: string;
}

/** Optional success counterpart (for symmetry in tests/docs). */
export interface ToolSuccessResult {
  readonly ok: true;
  readonly result?: unknown;
}

export type ToolResultEnvelope = ToolFailureResult | ToolSuccessResult;

/**
 * Catalog of common failure kinds → default hints the model can act on.
 * Keys are stable; extend without breaking (open record).
 */
export const TOOL_FAILURE_HINTS: Record<string, string> = {
  permission_denied: "Ask the user for approval or choose a different approach.",
  path_forbidden: "Stay within the workspace root; use an allowed path.",
  file_not_found: "Verify the path exists; read the parent directory first.",
  invalid_args: "Fix the tool arguments to match the schema and retry.",
  tool_timeout: "Simplify the operation or split it into smaller calls.",
  doom_loop: "The same call repeated; change the approach or ask the user.",
  approval_timeout: "The user did not respond; proceed without this tool or ask again later.",
  model_unavailable: "Try a different model or wait for the provider to recover.",
  unknown: "Inspect the error and retry with corrected input.",
};

/**
 * Format a tool failure for the model.
 *
 * @param error - Human/short error message (will be truncated)
 * @param hint  - Optional explicit hint; falls back to catalog by `kind`
 * @param kind  - Catalog key (e.g. "permission_denied")
 * @returns Stable string: `{"ok":false,"error":"...","hint":"..."}`
 */
export function formatToolFailure(
  error: string,
  hint?: string,
  kind?: string,
): string {
  const short = error.length > 500 ? `${error.slice(0, 500)}…` : error;
  const resolvedHint = hint ?? (kind ? TOOL_FAILURE_HINTS[kind] : undefined) ?? TOOL_FAILURE_HINTS.unknown;
  const payload: ToolFailureResult = {
    ok: false,
    error: short,
    ...(resolvedHint ? { hint: resolvedHint } : {}),
  };
  return JSON.stringify(payload);
}

/** True if a tool message content looks like our failure envelope. */
export function isToolFailureEnvelope(content: string): boolean {
  return content.startsWith('{"ok":false');
}
