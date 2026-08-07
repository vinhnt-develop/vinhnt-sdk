import { z } from "zod";
import { buildVntConfigSchema } from "./schema-gen.js";
import { CONFIG_GROUPS } from "./definition.js";

/** Known top-level config keys derived from CONFIG_GROUPS. */
const KNOWN_CONFIG_KEYS = new Set(
  CONFIG_GROUPS.flatMap((g) => g.fields.map((f) => f.key)),
);

export const VntConfigSchema = buildVntConfigSchema();

export const ProviderValueSchema = z.object({
  apiKey: z.string().default(""),
  baseUrl: z.string().default(""),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.record(z.string(), z.unknown()).default({}),
  blacklist: z.array(z.string()).default([]),
  whitelist: z.array(z.string()).default([]),
});
export type ProviderValue = z.infer<typeof ProviderValueSchema>;

/** Inferred from VntConfigSchema — auto-generated from CONFIG_GROUPS */
export type VntConfig = Omit<z.infer<typeof VntConfigSchema>, "providers"> & {
  providers: Record<string, ProviderValue>;
};

export const ProviderConfigSchema = z.object({
  apiKey: z.string().default(""),
  baseUrl: z.string().default(""),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const LearningConfigSchema = z.object({
  enabled: z.boolean().default(false),
  backgroundReview: z.boolean().default(false),
  memoryWriteApproval: z.boolean().default(true),
  skillWriteApproval: z.boolean().default(true),
  memoryCharLimit: z.number().int().min(100).max(100000).default(2200),
  userCharLimit: z.number().int().min(100).max(100000).default(1400),
});
export type LearningConfig = z.infer<typeof LearningConfigSchema>;

export const CompactionConfigSchema = z.object({
  strategy: z.enum(["naive", "llm"]).catch("naive"),
  headCount: z.number().int().min(1).default(3),
  tailCount: z.number().int().min(1).default(20),
  tokenBudget: z.number().int().min(1000).max(1000000).default(32000),
  maxToolOutputLength: z.number().int().min(100).default(500),
  triggerThreshold: z.number().min(0.1).max(1.0).default(0.75),
  charsPerToken: z.number().int().min(1).max(10).default(4),
});
export type CompactionConfig = z.infer<typeof CompactionConfigSchema>;

export const PermissionRuleConfigSchema = z.record(
  z.string(),
  z.union([z.string(), z.record(z.string(), z.string())]),
);
export type PermissionRuleConfig = z.infer<typeof PermissionRuleConfigSchema>;

export const PolicyRuleConfigSchema = z.object({
  pattern: z.string().min(1),
  action: z.enum(["allow", "ask", "deny"]),
  args: z.string().optional(),
});
export type PolicyRuleConfig = z.infer<typeof PolicyRuleConfigSchema>;

export const PolicyConfigSchema = z.object({
  defaultAction: z.enum(["ask", "allow", "deny"]).catch("ask"),
  rules: z.array(PolicyRuleConfigSchema).default([]),
});
export type PolicyConfig = z.infer<typeof PolicyConfigSchema>;

export const LspConfigSchema = z.object({
  autoDetect: z.boolean().default(true),
  diagnostics: z.boolean().default(true),
  servers: z.record(z.string(), z.unknown()).default({}),
  poolIdleTimeoutMs: z.number().int().min(10000).max(3600000).default(300000),
  poolMaxRetries: z.number().int().min(0).max(20).default(3),
  poolInitTimeoutMs: z.number().int().min(5000).max(300000).default(45000),
  poolWaitDiagnosticsMs: z.number().int().min(500).max(60000).default(5000),
});
export type LspConfig = z.infer<typeof LspConfigSchema>;

export const NotificationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  onFailure: z.boolean().default(true),
  onApproval: z.boolean().default(true),
  onSuccess: z.boolean().default(false),
});
export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;

export const NetworkConfigSchema = z.object({
  proxyEnabled: z.boolean().default(false),
  proxyUrl: z.string().default(""),
  timeout: z.number().int().min(1000).max(300000).default(30000),
  maxRetries: z.number().int().min(0).max(10).default(3),
  webSearchNumResults: z.number().int().min(1).max(20).default(5),
  webFetchMaxResponseSize: z.number().int().min(1024).max(10485760).default(524288),
});
export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;

export const ThemeConfigSchema = z.object({
  mode: z.enum(["dark", "light", "auto"]).catch("dark"),
  colors: z.record(z.string(), z.string()).default({}),
});
export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

export const DEFAULT_LEARNING: LearningConfig = {
  enabled: false,
  backgroundReview: false,
  memoryWriteApproval: true,
  skillWriteApproval: true,
  memoryCharLimit: 2200,
  userCharLimit: 1400,
};

export function validateConfig(raw: unknown, filePath?: string): VntConfig {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const unknownKeys = Object.keys(raw as Record<string, unknown>).filter(
      (k) => !KNOWN_CONFIG_KEYS.has(k),
    );
    if (unknownKeys.length > 0) {
      const prefix = filePath ? `${filePath}: ` : "";
      console.warn(
        `${prefix}Unknown config key(s): ${unknownKeys.map((k) => `'${k}'`).join(", ")}. These will be ignored.`,
      );
    }
  }
  const result = VntConfigSchema.safeParse(raw);
  if (!result.success) {
    const prefix = filePath ? `${filePath}: ` : "";
    throw new Error(
      `${prefix}Config validation failed: ${result.error.issues.map((i) => `[${i.path.join(".")}] ${i.message}`).join("; ")}`,
    );
  }
  return result.data as unknown as VntConfig;
}
