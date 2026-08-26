import type { PromptTier } from "./prompt.js";

export interface MemoryEntry {
  readonly key: string;
  readonly value: string;
  readonly tier: PromptTier;
  readonly charLimit: number;
}
