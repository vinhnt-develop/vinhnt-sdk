import { z } from "zod";

/**
 * User-selected resources for a specific LLM request.
 *
 * Captures what the user chose in the composer (tools, knowledge, plugins).
 * Empty arrays or undefined = send all (backward compatible default).
 *
 * Lives in its own module so `request-context.ts` and `run-event.ts` can both
 * import it without a circular dependency.
 */
export const LlmSnapshotSelectedToolSchema = z.union([
  z.string(),
  z.object({
    id: z.string(),
    name: z.string().optional(),
    enabled: z.boolean().optional(),
  }),
]);
export const LlmSnapshotSelectedKnowledgeSchema = z.union([
  z.string(),
  z.object({
    id: z.string(),
    key: z.string().optional(),
    enabled: z.boolean().optional(),
  }),
]);
export const LlmSnapshotSelectionSchema = z.object({
  tools: z.array(LlmSnapshotSelectedToolSchema).optional(),
  knowledge: z.array(LlmSnapshotSelectedKnowledgeSchema).optional(),
  plugins: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
/** Inferred type of {@link LlmSnapshotSelectionSchema}. */
export type LlmSnapshotSelection = z.infer<typeof LlmSnapshotSelectionSchema>;
