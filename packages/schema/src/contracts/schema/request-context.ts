import { z } from "zod";
import { isRequestId, isTraceId, isRunId } from "../branded.js";
import { LlmSnapshotSelectionSchema } from "./selection.js";

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
    /** Per-run workspace root override. When set, tools operate within this directory. */
    workspaceRoot: z.string().optional(),
    /** User-selected resources for this run (from composer). */
    selection: LlmSnapshotSelectionSchema.optional(),
    /** Agent identity at time of request. */
    agent: z.object({
      id: z.string().optional(),
      name: z.string().optional(),
    }).optional(),
  }).optional(),
});

/** Inferred type of {@link RequestContextSchema}. */
export type RequestContext = z.infer<typeof RequestContextSchema>;
