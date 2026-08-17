import { z } from "zod";

/** Status of an accepted/async run. */
export const RunStatusSchema = z.enum([
  "queued", "running", "awaiting_approval", "paused",
  "succeeded", "failed", "cancelled",
]);

/** Inferred type of {@link RunStatusSchema}. */
export type RunStatus = z.infer<typeof RunStatusSchema>;
