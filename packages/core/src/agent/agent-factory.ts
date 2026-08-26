import type { AgentId, AgentConfig, AgentProfile, AgentCapabilities, AgentPermissions, AgentRuleset } from "@vinhnt-sdk/schema";
import { mergeRulesets, normalizePermissions } from "@vinhnt-sdk/permission";
import { DEFAULT_MAX_STEPS } from "@vinhnt-sdk/step-executor";

/** Parameters for creating a primary agent config. */
export interface CreateAgentParams {
  id?: AgentId;
  profile: AgentProfile;
  capabilities?: AgentCapabilities;
  permissions?: AgentPermissions;
  systemPrompt?: string;
  temperature?: number;
}

/** Parameters for creating a sub-agent config (inherits from a parent). */
export interface SubAgentParams {
  id?: AgentId;
  profile: Pick<AgentProfile, "name" | "description">;
  capabilities?: AgentCapabilities;
  permissions?: AgentPermissions;
  systemPrompt?: string;
  temperature?: number;
}

function generateId(): AgentId {
  return `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` as AgentId;
}

/**
 * Create an {@link AgentConfig} from user parameters, applying sane defaults
 * (streaming enabled, primary permission mode) and validating required fields.
 */
export function createAgent(params: CreateAgentParams): AgentConfig {
  const { id, profile, capabilities, permissions, systemPrompt, temperature } = params;
  if (!profile.name) throw new Error("Agent name is required");
  if (!profile.description) throw new Error("Agent description is required");
  return {
    id: id ?? generateId(),
    profile,
    capabilities: {
      streaming: true,
      thinking: false,
      ...capabilities,
    },
    permissions: { mode: "primary", ...permissions },
    ...(systemPrompt !== undefined ? { systemPrompt } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
  };
}

function buildRuleset(parent: AgentConfig, child?: AgentPermissions): AgentRuleset | undefined {
  return { ...mergeRulesets(normalizePermissions(child), normalizePermissions(parent.permissions)) };
}

function buildPermissions(parent: AgentConfig, child?: AgentPermissions): AgentPermissions | undefined {
  if (!parent.permissions && !child) return undefined;

  // Use ruleset-based inheritance when available
  if (parent.permissions?.ruleset || child?.ruleset) {
    const merged = buildRuleset(parent, child);
    const perms: Record<string, unknown> = {
      mode: child?.mode ?? "subagent",
    };
    if (merged) perms.ruleset = merged;
    return perms as AgentPermissions;
  }

  // Legacy field-based inheritance (backwards compat)
  const allowedTools = child?.allowedTools ?? parent.permissions?.allowedTools;
  const deniedTools = [
    ...(parent.permissions?.deniedTools ?? []),
    ...(child?.deniedTools ?? []),
  ];
  const allowedRisks = child?.allowedRisks ?? parent.permissions?.allowedRisks;

  const perms: Record<string, unknown> = {
    mode: child?.mode ?? "subagent",
  };
  if (allowedTools) perms.allowedTools = allowedTools;
  if (deniedTools.length > 0) perms.deniedTools = deniedTools;
  if (allowedRisks) perms.allowedRisks = allowedRisks;

  const parentMaxSteps = parent.permissions?.maxSteps ?? DEFAULT_MAX_STEPS;
  const childMaxSteps = child?.maxSteps;
  if (childMaxSteps !== undefined || parent.permissions?.maxSteps !== undefined) {
    perms.maxSteps = Math.min(childMaxSteps ?? parentMaxSteps, parentMaxSteps);
  }

  const DEFAULT_MAX_TOKENS = 100000;
  const parentMaxTokens = parent.permissions?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const childMaxTokens = child?.maxTokens;
  if (childMaxTokens !== undefined || parent.permissions?.maxTokens !== undefined) {
    perms.maxTokens = Math.min(childMaxTokens ?? parentMaxTokens, parentMaxTokens);
  }

  return Object.keys(perms).length > 0 ? perms as AgentPermissions : undefined;
}

/** Validate an agent config; returns a list of human-readable error messages (empty when valid). */
export function validateAgentConfig(config: AgentConfig): string[] {
  const errors: string[] = [];
  if (!config.id) errors.push("Agent id is required");
  if (!config.profile?.name) errors.push("Agent profile.name is required");
  if (!config.profile?.description) errors.push("Agent profile.description is required");

  const mode = config.permissions?.mode;
  if (mode && !["primary", "subagent", "all"].includes(mode)) {
    errors.push(`Invalid mode: ${mode}. Expected primary, subagent, or all`);
  }

  const rules = config.permissions?.ruleset?.rules;
  if (rules) {
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i]!;
      if (!r.effect || !["allow", "deny"].includes(r.effect)) {
        errors.push(`Rule[${i}]: effect must be 'allow' or 'deny'`);
      }
      if (!r.target) errors.push(`Rule[${i}]: target is required`);
    }
  }

  return errors;
}

/**
 * Create a sub-agent config that inherits (and constrains) the parent's
 * permissions, steps and token budget.
 */
export function createSubAgent(params: SubAgentParams, parent: AgentConfig): AgentConfig {
  const { id, profile, capabilities, permissions, systemPrompt, temperature } = params;
  if (!profile.name) throw new Error("Sub-agent name is required");
  if (!profile.description) throw new Error("Sub-agent description is required");

  return {
    id: id ?? generateId(),
    profile: {
      name: profile.name,
      description: profile.description,
      ...(parent.profile.version ? { version: parent.profile.version } : {}),
      ...(parent.profile.author ? { author: parent.profile.author } : {}),
    },
    capabilities: {
      streaming: parent.capabilities.streaming ?? true,
      thinking: parent.capabilities.thinking ?? false,
      ...capabilities,
    },
    ...(buildPermissions(parent, permissions) ? { permissions: buildPermissions(parent, permissions)! } : {}),
    ...(systemPrompt !== undefined ? { systemPrompt } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
  };
}
