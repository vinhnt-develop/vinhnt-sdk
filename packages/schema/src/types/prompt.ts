export type PromptTier = "stable" | "context" | "volatile";

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
