import { z } from "zod";

export const RunStatusSchema = z.enum([
  "queued", "running", "awaiting_approval", "paused",
  "succeeded", "failed", "cancelled",
]);

export type RunStatus = z.infer<typeof RunStatusSchema>;
