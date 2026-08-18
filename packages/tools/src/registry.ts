import type { ToolDefinition, ToolContext, ToolRisk } from "./definitions.js";
import { wildcardMatch } from "@vinhnt-sdk/schema";
import { ToolNotFoundError } from "@vinhnt-sdk/schema";
import type { DomainManifest, DomainSummary } from "./domain.js";
import { summarizeDomains } from "./domain.js";
import { validateInput } from "./validate.js";

/** Filter options for listing tools. */
export type ToolFilter = {
  risk?: ToolRisk;
  ids?: string[];
  pattern?: string;
};

/** Minimal permission rule relevant for tool filtering at the tool boundary. */
export interface ToolPermissionRule {
  /** Tool id or wildcard pattern (e.g. "coding.*", "*"). */
  action: string;
  effect: "allow" | "deny" | "ask";
}

/** Tool set materialized for the model after filtering by permission rules. */
export interface ToolMaterialization {
  /** Provider-facing definitions the model is ALLOWED to see/invoke. */
  definitions: readonly ToolDefinition[];
  /** Tool definitions that were denied by permission rules. */
  denied: readonly ToolDefinition[];
  /** Resolve one tool call: validate args and execute. */
  settle(input: { name: string; args: unknown; ctx?: ToolContext }): Promise<unknown>;
  /** Lookup a tool definition by ID from the allowed set. */
  getTool(id: string): ToolDefinition | undefined;
}

/** Registers tools and domains, filters by permission, and materializes model-visible tool sets. */
export class ToolRegistry {
  protected readonly tools = new Map<string, ToolDefinition>();
  protected readonly domains = new Map<string, DomainManifest>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool);
  }

  /** Register a named domain and its tool membership (metadata only — does not register the tools). */
  registerDomain(manifest: DomainManifest): void {
    this.domains.set(manifest.id, manifest);
  }

  getDomains(): readonly DomainManifest[] {
    return [...this.domains.values()];
  }

  /** Resolve the domain id a tool belongs to, or undefined if it is a core tool. */
  domainFor(id: string): string | undefined {
    for (const [domainId, manifest] of this.domains) {
      if (manifest.tools.some((t) => t.id === id)) return domainId;
    }
    return undefined;
  }

  /** Get all registered domain manifests. */
  listDomains(): readonly DomainManifest[] {
    return [...this.domains.values()];
  }

  /** Get domain summaries for UI/API consumption. */
  domainSummaries(): DomainSummary[] {
    return summarizeDomains([...this.domains.values()]);
  }

  /** Get tools belonging to a specific domain. */
  toolsForDomain(domainId: string): readonly ToolDefinition[] {
    const manifest = this.domains.get(domainId);
    return manifest?.tools ?? [];
  }

  unregister(id: string): boolean {
    return this.tools.delete(id);
  }

  get(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  list(filter?: ToolFilter): readonly ToolDefinition[] {
    const all = [...this.tools.values()];
    if (!filter) return all;
    return all.filter((t) => {
      if (filter.risk && t.risk !== filter.risk) return false;
      if (filter.ids && !filter.ids.includes(t.id)) return false;
      if (filter.pattern && !wildcardMatch(filter.pattern, t.id)) return false;
      return true;
    });
  }

  count(): number {
    return this.tools.size;
  }

  /** Get a tool by ID, throwing a typed error if not found */
  getOrThrow(id: string): ToolDefinition {
    const tool = this.tools.get(id);
    if (!tool) throw new ToolNotFoundError(id);
    return tool;
  }

  /**
   * Materialize the tool set for a given permission ruleset: drop tools the
   * model must not see (wholly-denied), and return a `settle` that validates
   * and executes a single tool call. Defaults to exposing every registered tool.
   */
  materialize(permissions?: readonly ToolPermissionRule[]): ToolMaterialization {
    const allTools = [...this.tools.values()];
    const allowed = this.filterByRules(allTools, permissions);
    const allowedIds = new Set(allowed.map((t) => t.id));
    const denied = allTools.filter((t) => !allowedIds.has(t.id));
    const allowedMap = new Map(allowed.map((t) => [t.id, t]));

    return {
      definitions: allowed,
      denied,
      getTool: (id) => allowedMap.get(id),
      settle: async ({ name, args, ctx }) => {
        // Resolve through the allowed set only — a tool filtered out by a deny
        // rule is NOT executable via settle.
        const tool = allowedMap.get(name);
        if (!tool) throw new ToolNotFoundError(name);
        // Validate input via Zod schema if available (non-breaking: falls through to raw execute if no schema)
        let validatedInput = args;
        if (tool.inputZodSchema) {
          validatedInput = validateInput(name, tool.inputZodSchema, args);
        }
        const defaultCtx: ToolContext = {
          sessionId: "",
          runId: "",
          agentId: "",
          agentName: "",
          signal: new AbortController().signal,
          env: {},
          ask: async () => "once",
          metadata: () => {},
          setCompensation: () => {},
        };
        return tool.execute(validatedInput, ctx ?? defaultCtx);
      },
    };
  }

  /** Remove tools whose rule is wholly denied (deny "*" / deny this tool). */
  private filterByRules(
    tools: readonly ToolDefinition[],
    permissions?: readonly ToolPermissionRule[],
  ): readonly ToolDefinition[] {
    if (!permissions || permissions.length === 0) return tools;
    const deniedActions = new Set<string>();
    for (const rule of permissions) {
      if (rule.effect === "deny") deniedActions.add(rule.action);
    }
    return tools.filter((t) => isDenied(t.id, deniedActions) === false);
  }
}

/** A tool is denied if it matches a deny rule (exact or wildcard). */
function isDenied(id: string, deniedActions: Set<string>): boolean {
  for (const pattern of deniedActions) {
    if (wildcardMatch(pattern, id)) return true;
  }
  return false;
}