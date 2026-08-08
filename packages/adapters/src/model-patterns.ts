export interface ModelPattern {
  pattern: RegExp;
  provider: string;
  priority: number;
}

/**
 * Registry-based model pattern matching.
 * User tự extend patterns thay vì fix cứng trong code.
 */
export class ModelPatternRegistry {
  private patterns: ModelPattern[] = [];

  constructor(defaultPatterns?: ModelPattern[]) {
    if (defaultPatterns) {
      this.patterns = [...defaultPatterns];
    }
  }

  /**
   * Register a custom pattern for provider inference.
   */
  register(pattern: ModelPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Register multiple patterns.
   */
  registerAll(patterns: ModelPattern[]): void {
    this.patterns.push(...patterns);
  }

  /**
   * Infer provider from model ID.
   */
  matchProvider(modelId: string): string | null {
    const matches = this.patterns
      .filter((mp) => mp.pattern.test(modelId))
      .sort((a, b) => b.priority - a.priority);
    return matches[0]?.provider ?? null;
  }
}

/**
 * Default patterns — convenience only.
 * User tự merge: `registry.registerAll(DEFAULT_MODEL_PATTERNS)`
 */
export const DEFAULT_MODEL_PATTERNS: ModelPattern[] = [
  // OpenAI
  { pattern: /^gpt-/i,                          provider: "openai",    priority: 10 },
  { pattern: /^o[0-9]/i,                         provider: "openai",    priority: 10 },
  { pattern: /^text-davinci/i,                    provider: "openai",    priority: 10 },
  { pattern: /^dall-e/i,                          provider: "openai",    priority: 10 },
  { pattern: /^tts-/i,                            provider: "openai",    priority: 10 },
  { pattern: /^whisper-/i,                        provider: "openai",    priority: 10 },
  { pattern: /^embedding-/i,                      provider: "openai",    priority: 10 },

  // Anthropic
  { pattern: /^claude/i,                          provider: "anthropic", priority: 10 },

  // Google Gemini
  { pattern: /^gemini/i,                          provider: "gemini",    priority: 10 },
  { pattern: /^learnlm/i,                         provider: "gemini",    priority: 10 },

  // Groq
  { pattern: /^(llama|mixtral|gemma2?)-?/i,       provider: "groq",      priority: 5 },
  { pattern: /^distil-whisper/i,                   provider: "groq",      priority: 5 },
  { pattern: /^whisper-large/i,                    provider: "groq",      priority: 5 },

  // Mistral
  { pattern: /^mistral/i,                         provider: "mistral",   priority: 10 },
  { pattern: /^pixtral/i,                         provider: "mistral",   priority: 10 },
  { pattern: /^codestral/i,                        provider: "mistral",   priority: 10 },
  { pattern: /^open-mistral/i,                     provider: "mistral",   priority: 10 },

  // DeepSeek
  { pattern: /^deepseek/i,                        provider: "deepseek",  priority: 10 },

  // Perplexity
  { pattern: /^(sonar|pplx)/i,                    provider: "perplexity", priority: 10 },

  // Cohere
  { pattern: /^command/i,                         provider: "cohere",    priority: 10 },
  { pattern: /^embed-english/i,                    provider: "cohere",    priority: 10 },

  // Together AI
  { pattern: /^(together|meta-llama)/i,            provider: "together",  priority: 3 },

  // Replicate
  { pattern: /^(replicate|meta\/llama)/i,          provider: "replicate", priority: 3 },
];

/**
 * @deprecated Use ModelPatternRegistry.matchProvider() with DEFAULT_MODEL_PATTERNS instead.
 * Kept for backward compatibility.
 */
export const MODEL_PATTERNS = DEFAULT_MODEL_PATTERNS;

/**
 * @deprecated Use ModelPatternRegistry instead.
 * Kept for backward compatibility.
 */
export function matchProvider(modelId: string): string | null {
  const registry = new ModelPatternRegistry(DEFAULT_MODEL_PATTERNS);
  return registry.matchProvider(modelId);
}
