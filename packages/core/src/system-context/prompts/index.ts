import { DEFAULT_PROMPT } from "./default.js";
import { ANTHROPIC_PROMPT } from "./anthropic.js";
import { OPENAI_PROMPT } from "./openai.js";
import { GEMINI_PROMPT } from "./gemini.js";
import { DEEPSEEK_PROMPT } from "./deepseek.js";

/**
 * Prompt variant — string type, NOT closed union.
 * User có thể register custom variant cho model/provider mới.
 */
export type PromptVariant = string;

/**
 * Prompt mapping — default exports, user merge được.
 * Key: prompt variant name, Value: prompt text
 */
export const DEFAULT_PROMPT_MAP: Record<string, string> = {
  default: DEFAULT_PROMPT,
  anthropic: ANTHROPIC_PROMPT,
  openai: OPENAI_PROMPT,
  gemini: GEMINI_PROMPT,
  deepseek: DEEPSEEK_PROMPT,
};

/**
 * Default model-to-prompt matching rules.
 * User override được qua PromptRegistry hoặc selectPrompt() options.
 */
export const DEFAULT_MODEL_PROMPT_MAP: Array<{
  patterns: string[];
  variant: string;
}> = [
  { patterns: ["claude", "anthropic"], variant: "anthropic" },
  { patterns: ["gpt", "o1", "o3", "openai"], variant: "openai" },
  { patterns: ["gemini"], variant: "gemini" },
  { patterns: ["deepseek"], variant: "deepseek" },
];

export interface PromptRegistryConfig {
  /** Custom prompt map — merge với DEFAULT_PROMPT_MAP */
  prompts?: Record<string, string>;
  /** Custom model-to-prompt rules — override DEFAULT_MODEL_PROMPT_MAP */
  modelPromptMap?: Array<{ patterns: string[]; variant: string }>;
  /** Fallback variant nếu không match (default: "default") */
  fallback?: string;
}

/**
 * Prompt registry — injectable dependency for model-to-prompt mapping.
 * User register custom variant mà không cần fork.
 */
export class PromptRegistry {
  private prompts: Record<string, string>;
  private modelPromptMap: Array<{ patterns: string[]; variant: string }>;
  private fallback: string;

  constructor(config?: PromptRegistryConfig) {
    this.prompts = { ...DEFAULT_PROMPT_MAP, ...config?.prompts };
    this.modelPromptMap = config?.modelPromptMap ?? DEFAULT_MODEL_PROMPT_MAP;
    this.fallback = config?.fallback ?? "default";
  }

  /** Register a custom prompt variant */
  register(variant: string, prompt: string): void {
    this.prompts[variant] = prompt;
  }

  /** Add a model-to-prompt mapping rule */
  addModelRule(patterns: string[], variant: string): void {
    this.modelPromptMap.push({ patterns, variant });
  }

  /** Get prompt for a model */
  selectPrompt(modelId?: string): string {
    if (!modelId) return this.prompts[this.fallback] ?? DEFAULT_PROMPT;
    const id = modelId.toLowerCase();

    for (const rule of this.modelPromptMap) {
      if (rule.patterns.some((p) => id.includes(p))) {
        return this.prompts[rule.variant] ?? this.prompts[this.fallback] ?? DEFAULT_PROMPT;
      }
    }

    return this.prompts[this.fallback] ?? DEFAULT_PROMPT;
  }

  /** Get prompt by variant name */
  getPrompt(variant: string): string {
    return this.prompts[variant] ?? this.prompts[this.fallback] ?? DEFAULT_PROMPT;
  }

  /** List all registered variants */
  listVariants(): string[] {
    return Object.keys(this.prompts);
  }
}

/** Default registry instance — exported for convenience */
export const defaultPromptRegistry = new PromptRegistry();

/**
 * Select prompt for a model — backward compatible function.
 *
 * @deprecated Use PromptRegistry.selectPrompt() for full control.
 * This function uses default matching rules.
 */
export function selectPrompt(modelId?: string): string {
  return defaultPromptRegistry.selectPrompt(modelId);
}
