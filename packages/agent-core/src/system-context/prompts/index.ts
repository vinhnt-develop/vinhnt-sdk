import { DEFAULT_PROMPT } from "./default.js";
import { ANTHROPIC_PROMPT } from "./anthropic.js";
import { OPENAI_PROMPT } from "./openai.js";
import { GEMINI_PROMPT } from "./gemini.js";
import { DEEPSEEK_PROMPT } from "./deepseek.js";

export type PromptVariant = "default" | "anthropic" | "openai" | "gemini" | "deepseek";

export function selectPrompt(modelId?: string): string {
  if (!modelId) return DEFAULT_PROMPT;
  const id = modelId.toLowerCase();

  if (id.includes("claude") || id.includes("anthropic")) {
    return ANTHROPIC_PROMPT;
  }
  if (id.includes("gpt") || id.includes("o1") || id.includes("o3") || id.includes("openai")) {
    return OPENAI_PROMPT;
  }
  if (id.includes("gemini")) {
    return GEMINI_PROMPT;
  }
  if (id.includes("deepseek")) {
    return DEEPSEEK_PROMPT;
  }

  return DEFAULT_PROMPT;
}
