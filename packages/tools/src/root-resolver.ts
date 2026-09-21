/**
 * Shared workspace root resolution for tool factories.
 *
 * Tools accept either a static path string or a lazy getter function.
 * This module consolidates the pattern used by file-tools, git-tools,
 * search-tools, and lsp/bridge.
 */

/** Workspace root: static path or lazy getter. */
export type RootGetter = string | (() => string);

/** Resolve a `RootGetter` to an absolute path string. */
export function resolveRoot(r: RootGetter): string {
  return typeof r === "function" ? r() : r;
}
