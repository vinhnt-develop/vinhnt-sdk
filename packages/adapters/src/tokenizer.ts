import { get_encoding } from "tiktoken";
import type { TiktokenEncoding } from "tiktoken";

const MODEL_ENCODING: Record<string, TiktokenEncoding> = {
  "gpt-4o": "o200k_base",
  "gpt-4o-2024-08-06": "o200k_base",
  "gpt-4o-mini": "o200k_base",
  "gpt-4o-mini-2024-07-18": "o200k_base",
  "gpt-4-turbo": "cl100k_base",
  "gpt-4-turbo-preview": "cl100k_base",
  "gpt-4": "cl100k_base",
  "gpt-3.5-turbo": "cl100k_base",
  "o1-mini": "o200k_base",
  "o1-preview": "o200k_base",
  "claude-sonnet-4-20250514": "cl100k_base",
  "claude-sonnet-4": "cl100k_base",
  "claude-3-opus-20240229": "cl100k_base",
  "claude-3-sonnet-20240229": "cl100k_base",
  "claude-3-haiku-20240307": "cl100k_base",
  "claude-sonnet-3.5": "cl100k_base",
  "claude-haiku-3": "cl100k_base",
  "deepseek-chat": "cl100k_base",
  "deepseek-coder": "cl100k_base",
  "nemotron": "cl100k_base",
  "llama": "cl100k_base",
  "mistral": "cl100k_base",
  "mixtral": "cl100k_base",
  "qwen": "cl100k_base",
  "gemma": "cl100k_base",
};

let cachedEnc: ReturnType<typeof get_encoding> | null = null;
let cachedEncName = "";

function resolveEncoding(text: string, model?: string): number {
  if (model) {
    let encName: string | undefined;
    const exact = MODEL_ENCODING[model];
    if (exact) {
      encName = exact;
    } else {
      const modelLower = model.toLowerCase();
      for (const [key, enc] of Object.entries(MODEL_ENCODING)) {
        if (modelLower.includes(key.toLowerCase())) {
          encName = enc;
          break;
        }
      }
    }
    if (encName) {
      if (!cachedEnc || cachedEncName !== encName) {
        if (cachedEnc) cachedEnc.free();
        cachedEncName = encName;
        cachedEnc = get_encoding(encName as TiktokenEncoding);
      }
      return cachedEnc.encode(text).length;
    }
  }
  return Math.ceil(text.length / 4);
}

export function countTokens(text: string, model?: string): number {
  try {
    return resolveEncoding(text, model);
  } catch {
    return Math.ceil(text.length / 4);
  }
}

export function countTokensSafe(text: string, model?: string): number {
  try {
    return countTokens(text, model);
  } catch {
    return Math.ceil(text.length / 4);
  }
}
