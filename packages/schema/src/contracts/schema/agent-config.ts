import { z } from "zod";
import { isAgentId } from "../branded.js";

/** Zod schema for agent mode — open: known modes plus arbitrary extensions (matches the open {@link AgentMode} type). */
export const AgentModeSchema = z.enum(["primary", "subagent", "all"]).or(z.string());
/** Inferred type of {@link AgentModeSchema}. */
export type AgentMode = z.infer<typeof AgentModeSchema>;

/** Zod schema for agent behaviour mode — open: known modes plus arbitrary extensions; no silent coercion. */
export const AgentBehaviourModeSchema = z.enum(["build", "plan"]).or(z.string());
/** Inferred type of {@link AgentBehaviourModeSchema}. */
export type AgentBehaviourMode = z.infer<typeof AgentBehaviourModeSchema>;

/** Zod schema for a single permission rule. */
export const AgentRuleSchema = z.object({
  effect: z.enum(["allow", "deny", "ask"]),
  target: z.string().min(1),
  paramPattern: z.string().optional(),
  reason: z.string().optional(),
});
/** Inferred type of {@link AgentRuleSchema}. */
export type AgentRule = z.infer<typeof AgentRuleSchema>;

/** Zod schema for a rule set. */
export const AgentRulesetSchema = z.object({
  rules: z.array(AgentRuleSchema).optional(),
  allowedRisks: z.array(z.string()).optional(),
  maxSteps: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
  inheritFromParent: z.boolean().optional().default(true),
});
/** Inferred type of {@link AgentRulesetSchema}. */
export type AgentRuleset = z.infer<typeof AgentRulesetSchema>;

/** Zod schema for agent permission shorthand. */
export const AgentPermissionsSchema = z.object({
  mode: AgentModeSchema.optional(),
  ruleset: AgentRulesetSchema.optional(),
  allowedTools: z.array(z.string()).optional(),
  deniedTools: z.array(z.string()).optional(),
  allowedRisks: z.array(z.string()).optional(),
  maxSteps: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
});
/** Inferred type of {@link AgentPermissionsSchema}. */
export type AgentPermissions = z.infer<typeof AgentPermissionsSchema>;

/** Zod schema for agent profile. */
export const AgentProfileSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().optional(),
  author: z.string().optional(),
  model: z.string().optional(),
  hidden: z.boolean().optional(),
});
/** Inferred type of {@link AgentProfileSchema}. */
export type AgentProfile = z.infer<typeof AgentProfileSchema>;

/** Zod schema for agent capabilities. */
export const AgentCapabilitiesSchema = z.object({
  tools: z.array(z.string()).optional(),
  models: z.array(z.string()).optional(),
  maxTokens: z.number().int().positive().optional(),
  streaming: z.boolean().optional(),
  thinking: z.boolean().optional(),
});
/** Inferred type of {@link AgentCapabilitiesSchema}. */
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;

/** Zod schema for an agent config. */
export const AgentConfigSchema = z.object({
  id: z.string().refine(isAgentId, "Invalid AgentId"),
  profile: AgentProfileSchema,
  capabilities: AgentCapabilitiesSchema,
  permissions: AgentPermissionsSchema.optional(),
  behaviourMode: AgentBehaviourModeSchema.optional(),
  domains: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().optional(),
});
/** Inferred type of {@link AgentConfigSchema}. */
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
