/**
 * Shared external-path containment policy for path-aware tools.
 *
 * Single source of truth for "which tools are path-aware" and "what counts as
 * escaping the workspace root", so the step executor and the tool-error router
 * can never drift apart (RV-45).
 *
 * @module step-executor/path-policy
 */

import { normalize } from "node:path";

/** Tools whose path arguments are validated against the workspace root. */
export const PATH_AWARE_TOOLS = new Set([
  "read_file", "write_file", "edit_file", "apply_patch",
  "list_directory", "glob_files", "grep_files", "shell", "read_image",
]);

/**
 * Check that every path argument of a path-aware tool stays inside the
 * workspace root. Returns a human-readable violation reason, or `undefined`
 * when the call is allowed (or not path-aware / no root configured).
 */
export function checkExternalPaths(
  toolName: string,
  args: unknown,
  workspaceRoot: string | undefined,
): string | undefined {
  if (!workspaceRoot || !PATH_AWARE_TOOLS.has(toolName)) return undefined;
  const input = args as Record<string, unknown> | undefined;
  if (!input) return undefined;
  const normalizedRoot = workspaceRoot.replace(/\\/g, "/") + "/";
  const pathCandidates = [input.filePath, input.path, input.dirPath].filter((p): p is string => typeof p === "string");
  for (const p of pathCandidates) {
    const absRaw: string = p.startsWith("/") || /^[A-Za-z]:[/\\]/.test(p) ? p : workspaceRoot + "/" + p;
    const absPath = normalize(absRaw).replace(/\\/g, "/");
    if (!absPath.startsWith(normalizedRoot)) {
      return `references path outside workspace: "${p}" (${absPath} not in ${normalizedRoot})`;
    }
  }
  return undefined;
}
