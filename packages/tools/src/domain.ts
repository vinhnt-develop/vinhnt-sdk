import type { ToolDefinition } from "./definitions.js";
import type { ToolPermissionRule } from "./registry.js";

/**
 * ── Domain manifests (Phase 2) ────────────────────────────────────────────
 * A domain is a named, swappable set of tools (e.g. "coding"). The agent core
 * treats domains as opaque: it only needs each tool's id (for membership) and
 * the set of domains an agent is allowed to use. This is the seam that lets
 * the same core power coding, research, data, devops — differing only by which
 * domains are mounted and which permission rules apply.
 */

/** A named group of tools exposed as a pluggable capability. */
export interface DomainManifest {
  /** Domain id used in agent config `domains: ["coding"]`. */
  readonly id: string;
  /** Tools belonging to this domain. Only `id`/`name` drives membership. */
  readonly tools: readonly ToolDefinition[];
  /** Optional domain-level system prompt (merged into the agent context). */
  readonly systemPrompt?: string;
  /** Domain-level permission defaults (allow/deny/ask) applied to its tools. */
  readonly permissionDefaults?: readonly ToolPermissionRule[];
}

/** Summary of a domain for UI/API consumption. */
export interface DomainSummary {
  readonly id: string;
  readonly toolCount: number;
  readonly toolIds: readonly string[];
  readonly hasSystemPrompt: boolean;
}

/**
 * Group the coding toolset (file/shell/search/web/image/git/lsp) under domain
 * "coding". Pass the tool definitions the composition root has already built.
 */
export function createCodingDomain(tools: readonly ToolDefinition[]): DomainManifest {
  return { id: "coding", tools };
}

/**
 * Build a domain summary map from a list of domain manifests.
 * Useful for API responses and UI rendering.
 */
export function summarizeDomains(domains: readonly DomainManifest[]): DomainSummary[] {
  return domains.map((d) => ({
    id: d.id,
    toolCount: d.tools.length,
    toolIds: d.tools.map((t) => t.id),
    hasSystemPrompt: !!d.systemPrompt,
  }));
}