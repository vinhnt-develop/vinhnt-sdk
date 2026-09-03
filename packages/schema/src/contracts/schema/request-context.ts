import { z } from "zod";
import { isRequestId, isTraceId, isRunId } from "../branded.js";

/** Request metadata (ids, actor, tenant) propagated through a run. */
export const RequestContextSchema = z.object({
  requestId: z.string().refine(isRequestId, "Invalid RequestId"),
  traceId: z.string().refine(isTraceId, "Invalid TraceId"),
  actorId: z.string(),
  tenantId: z.string(),
  parentRunId: z.string().refine(isRunId, "Invalid RunId").optional(),
  overrides: z.object({
    provider: z.string().optional(),
    model: z.string().optional(),
  }).optional(),
});

/** Inferred type of {@link RequestContextSchema}. */
export type RequestContext = z.infer<typeof RequestContextSchema>;
