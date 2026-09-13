import { z } from "zod";

/** Known prompt tiers. Use as reference, not exhaustive. */
export const KNOWN_PROMPT_TIERS = ["stable", "context", "volatile"] as const;

/** Prompt tier — open string for extensibility. */
export type PromptTier = string;

/** Zod schema for tiered prompt assembly. */
export const PromptAssemblySchema = z.object({
  stable: z.string(),
  context: z.string(),
  volatile: z.string(),
  assembled: z.string(),
  version: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
/** Inferred type of {@link PromptAssemblySchema}. */
export type PromptAssembly = z.infer<typeof PromptAssemblySchema>;

/** Zod schema for conversation compression summaries. */
export const CompressionSummarySchema = z.object({
  originalMessageCount: z.number(),
  compressedMessageCount: z.number(),
  summary: z.string().optional(),
});
/** Inferred type of {@link CompressionSummarySchema}. */
export type CompressionSummary = z.infer<typeof CompressionSummarySchema>;
