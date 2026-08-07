import { z } from "zod";

export const PromptAssemblySchema = z.object({
  stable: z.string(),
  context: z.string(),
  volatile: z.string(),
  assembled: z.string(),
  version: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type PromptAssembly = z.infer<typeof PromptAssemblySchema>;

export const CompressionSummarySchema = z.object({
  originalMessageCount: z.number(),
  compressedMessageCount: z.number(),
  summary: z.string().optional(),
});
export type CompressionSummary = z.infer<typeof CompressionSummarySchema>;
