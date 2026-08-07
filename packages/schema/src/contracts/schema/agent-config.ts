import { z } from "zod";
import { isAgentId } from "../branded.js";

export const AgentModeSchema = z.enum(["primary", "subagent", "all"]);
export type AgentMode = z.infer<typeof AgentModeSchema>;

export const AgentBehaviourModeSchema = z.enum(["build", "plan"]).catch("build");
export type AgentBehaviourMode = z.infer<typeof AgentBehaviourModeSchema>;

export const AgentRuleSchema = z.object({
  effect: z.enum(["allow", "deny", "ask"]),
  target: z.string().min(1),
  paramPattern: z.string().optional(),
  reason: z.string().optional(),
});
export type AgentRule = z.infer<typeof AgentRuleSchema>;

export const AgentRulesetSchema = z.object({
  rules: z.array(AgentRuleSchema).optional(),
  allowedRisks: z.array(z.string()).optional(),
  maxSteps: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
  inheritFromParent: z.boolean().optional().default(true),
});
export type AgentRuleset = z.infer<typeof AgentRulesetSchema>;

export const AgentPermissionsSchema = z.object({
  mode: AgentModeSchema.optional(),
  ruleset: AgentRulesetSchema.optional(),
  allowedTools: z.array(z.string()).optional(),
  deniedTools: z.array(z.string()).optional(),
  allowedRisks: z.array(z.string()).optional(),
  maxSteps: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
});
export type AgentPermissions = z.infer<typeof AgentPermissionsSchema>;

export const AgentProfileSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().optional(),
  author: z.string().optional(),
  model: z.string().optional(),
  hidden: z.boolean().optional(),
});
export type AgentProfile = z.infer<typeof AgentProfileSchema>;

export const AgentCapabilitiesSchema = z.object({
  tools: z.array(z.string()).optional(),
  models: z.array(z.string()).optional(),
  maxTokens: z.number().int().positive().optional(),
  streaming: z.boolean().optional(),
  thinking: z.boolean().optional(),
});
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;

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
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
