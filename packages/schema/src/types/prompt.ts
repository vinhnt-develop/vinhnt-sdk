/** Known prompt tiers. Use as reference, not exhaustive. */
export const KNOWN_PROMPT_TIERS = ["stable", "context", "volatile"] as const;

/** Prompt tier — open string for extensibility. */
export type PromptTier = string;

/** Inferred type of {@link PromptAssemblySchema}. */
export interface PromptAssembly {
  readonly stable: string;
  readonly context: string;
  readonly volatile: string;
  readonly assembled: string;
  readonly version: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Inferred type of {@link CompressionSummarySchema}. */
export interface CompressionSummary {
  readonly originalMessageCount: number;
  readonly compressedMessageCount: number;
  readonly summary: string | undefined;
}
