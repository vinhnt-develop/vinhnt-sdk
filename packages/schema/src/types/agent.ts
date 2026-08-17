import type { AgentId } from "../contracts/branded.js";

/** Known agent modes. Use as reference, not exhaustive. */
export const KNOWN_AGENT_MODES = ["primary", "subagent", "all"] as const;

/** Agent mode — open string for extensibility. */
export type AgentMode = string;

/** Behaviour mode: determines which tools the agent can use. Build = full access, Plan = read-only. */
export type AgentBehaviourMode = "build" | "plan" | (string & {});

/** Inferred type of {@link AgentProfileSchema}. */
export interface AgentProfile {
  readonly name: string;
  readonly description: string;
  readonly version?: string;
  readonly author?: string;
  readonly model?: string;
  readonly hidden?: boolean;
}

/** Inferred type of {@link AgentCapabilitiesSchema}. */
export interface AgentCapabilities {
  readonly tools?: readonly string[];
  readonly models?: readonly string[];
  readonly maxTokens?: number;
  readonly streaming?: boolean;
  readonly thinking?: boolean;
}

/** Inferred type of {@link AgentRuleSchema}. */
export interface AgentRule {
  readonly effect: "allow" | "deny" | "ask";
  readonly target: string;
  readonly paramPattern?: string;
  readonly reason?: string;
}

/** Inferred type of {@link AgentRulesetSchema}. */
export interface AgentRuleset {
  readonly rules?: readonly AgentRule[];
  readonly allowedRisks?: readonly string[];
  readonly maxSteps?: number;
  readonly maxTokens?: number;
  readonly inheritFromParent?: boolean;
}

/** Inferred type of {@link AgentPermissionsSchema}. */
export interface AgentPermissions {
  readonly mode?: AgentMode;
  readonly ruleset?: AgentRuleset;
  readonly allowedTools?: readonly string[];
  readonly deniedTools?: readonly string[];
  readonly allowedRisks?: readonly string[];
  readonly maxSteps?: number;
  readonly maxTokens?: number;
}

/** Inferred type of {@link AgentConfigSchema}. */
export interface AgentConfig {
  readonly id: AgentId;
  readonly profile: AgentProfile;
  readonly capabilities: AgentCapabilities;
  readonly permissions?: AgentPermissions;
  readonly behaviourMode?: AgentBehaviourMode;
  /** Domain ids this agent may use (e.g. "coding"). Undefined = no domain filtering (all tools). */
  readonly domains?: readonly string[];
  readonly systemPrompt?: string;
  readonly temperature?: number;
}
