import { z } from "zod";
import { isRequestId, isTraceId, isRunId } from "../branded.js";

export const RequestContextSchema = z.object({
  requestId: z.string().refine(isRequestId, "Invalid RequestId"),
  traceId: z.string().refine(isTraceId, "Invalid TraceId"),
  actorId: z.string(),
  tenantId: z.string(),
  parentRunId: z.string().refine(isRunId, "Invalid RunId").optional(),
});

export type RequestContext = z.infer<typeof RequestContextSchema>;
