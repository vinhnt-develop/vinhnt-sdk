/** Known prompt tiers. Use as reference, not exhaustive. */
export const KNOWN_PROMPT_TIERS = ["stable", "context", "volatile"] as const;

/** Prompt tier — open string for extensibility. */
export type PromptTier = string;

export interface PromptAssembly {
  readonly stable: string;
  readonly context: string;
  readonly volatile: string;
  readonly assembled: string;
  readonly version: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CompressionSummary {
  readonly originalMessageCount: number;
  readonly compressedMessageCount: number;
  readonly summary: string | undefined;
}
