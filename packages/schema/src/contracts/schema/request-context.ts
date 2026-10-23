import { z } from "zod";
import { isRequestId, isTraceId, isRunId } from "../branded.js";
import { LlmSnapshotSelectionSchema } from "./selection.js";

/**
 * Durable execution contract for a sub-agent run.
 *
 * `tool` runs an isolated child run (own transcript) and returns its output to
 * the parent. `handoff` transfers control in the same run; hosts should record
 * it as a control-transfer fact rather than a child run.
 */
export const SubAgentExecutionSchema = z.object({
  mode: z.enum(["tool", "handoff"]),
  parentAgentId: z.string().optional(),
  toolName: z.string().optional(),
  /** Tool globs the child may use. Absent means inherit the parent's ceiling. */
  allowlist: z.array(z.string()).optional(),
  deniedTools: z.array(z.string()).optional(),
  budget: z.object({
    maxSteps: z.number().optional(),
    maxTokens: z.number().optional(),
    maxDepth: z.number().optional(),
  }).optional(),
  /** `isolated` for tool mode; `shared` for an in-run handoff. */
  transcript: z.enum(["isolated", "shared"]).optional(),
});

export type SubAgentExecution = z.infer<typeof SubAgentExecutionSchema>;

/** Request metadata (ids, actor, tenant) propagated through a run. */
export const RequestContextSchema = z.object({
  requestId: z.string().refine(isRequestId, "Invalid RequestId"),
  traceId: z.string().refine(isTraceId, "Invalid TraceId"),
  actorId: z.string(),
  tenantId: z.string(),
  parentRunId: z.string().refine(isRunId, "Invalid RunId").optional(),
  subAgent: SubAgentExecutionSchema.optional(),
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
