import { get_encoding } from "tiktoken";
import type { TiktokenEncoding } from "tiktoken";

export interface EncodingRegistration {
  /** Model ID or pattern to match */
  model: string;
  /** Tiktoken encoding name */
  encoding: TiktokenEncoding;
  /** If true, model ID is used as prefix for matching */
  prefix?: boolean;
}

/**
 * Registry-based tokenizer encoding resolution.
 * User tự register encoding cho model mới.
 */
export class TokenizerRegistry {
  private registrations: EncodingRegistration[] = [];

  constructor(defaultRegistrations?: EncodingRegistration[]) {
    if (defaultRegistrations) {
      this.registrations = [...defaultRegistrations];
    }
  }

  /**
   * Register an encoding for a model.
   */
  register(registration: EncodingRegistration): void {
    this.registrations.push(registration);
  }

  /**
   * Register multiple encodings.
   */
  registerAll(registrations: EncodingRegistration[]): void {
    this.registrations.push(...registrations);
  }

  /**
   * Resolve encoding name from model ID.
   */
  resolveEncoding(model?: string): TiktokenEncoding | null {
    if (!model) return null;

    // Exact match first
    const exact = this.registrations.find((r) => r.model === model);
    if (exact) return exact.encoding;

    // Prefix match
    const modelLower = model.toLowerCase();
    for (const reg of this.registrations) {
      if (reg.prefix && modelLower.startsWith(reg.model.toLowerCase())) {
        return reg.encoding;
      }
    }

    // Substring match (fallback)
    for (const reg of this.registrations) {
      if (modelLower.includes(reg.model.toLowerCase())) {
        return reg.encoding;
      }
    }

    return null;
  }
}

/**
 * Default encoding registrations — convenience only.
 * User tự extend: `registry.register({ model: "my-model", encoding: "cl100k_base" })`
 */
export const DEFAULT_MODEL_ENCODINGS: EncodingRegistration[] = [
  // OpenAI
  { model: "gpt-4o", encoding: "o200k_base", prefix: true },
  { model: "gpt-4-turbo", encoding: "cl100k_base", prefix: true },
  { model: "gpt-4", encoding: "cl100k_base", prefix: true },
  { model: "gpt-3.5-turbo", encoding: "cl100k_base", prefix: true },
  { model: "o1-mini", encoding: "o200k_base" },
  { model: "o1-preview", encoding: "o200k_base" },

  // Anthropic
  { model: "claude", encoding: "cl100k_base", prefix: true },

  // Others
  { model: "deepseek", encoding: "cl100k_base", prefix: true },
  { model: "nemotron", encoding: "cl100k_base" },
  { model: "llama", encoding: "cl100k_base", prefix: true },
  { model: "mistral", encoding: "cl100k_base", prefix: true },
  { model: "mixtral", encoding: "cl100k_base", prefix: true },
  { model: "qwen", encoding: "cl100k_base", prefix: true },
  { model: "gemma", encoding: "cl100k_base", prefix: true },
];

let cachedEnc: ReturnType<typeof get_encoding> | null = null;
let cachedEncName = "";

function resolveEncodingWithFallback(text: string, model?: string): number {
  const registry = new TokenizerRegistry(DEFAULT_MODEL_ENCODINGS);
  const encName = registry.resolveEncoding(model);

  if (encName) {
    if (!cachedEnc || cachedEncName !== encName) {
      if (cachedEnc) cachedEnc.free();
      cachedEncName = encName;
      cachedEnc = get_encoding(encName as TiktokenEncoding);
    }
    return cachedEnc.encode(text).length;
  }

  return Math.ceil(text.length / 4);
}

export function countTokens(text: string, model?: string): number {
  try {
    return resolveEncodingWithFallback(text, model);
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

/**
 * @deprecated Use TokenizerRegistry with DEFAULT_MODEL_ENCODINGS instead.
 */
export const MODEL_ENCODING: Record<string, TiktokenEncoding> = Object.fromEntries(
  DEFAULT_MODEL_ENCODINGS.map((r) => [r.model, r.encoding])
);
