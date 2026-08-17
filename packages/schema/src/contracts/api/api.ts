import { z } from "zod";

/** Pagination query parameters (limit/offset). */
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Accepted-run response with status/event polling URLs. */
export const RunResultSchema = z.object({
  runId: z.string(),
  statusUrl: z.string(),
  eventsUrl: z.string(),
  queued: z.boolean().optional(),
});

/** Inferred type of {@link RunResultSchema}. */
export type RunResult = z.infer<typeof RunResultSchema>;

/** Standard error response body. */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
});

/** Inferred type of {@link ErrorResponseSchema}. */
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/** Request body for creating a shared session. */
export const CreateShareSchema = z.object({
  sessionId: z.string().min(1),
  ttlHours: z.number().int().min(1).max(720).default(168),  // default 7 days
  password: z.string().optional(),
});

/** Inferred type of {@link CreateShareSchema}. */
export type CreateShare = z.infer<typeof CreateShareSchema>;

/** Response body for a created shared session. */
export const ShareResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  sessionId: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  passwordProtected: z.boolean(),
});

/** Inferred type of {@link ShareResponseSchema}. */
export type ShareResponse = z.infer<typeof ShareResponseSchema>;

/** A shared session with its messages. */
export const SharedSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  messageCount: z.number(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string(),
    createdAt: z.string().optional(),
  })),
});

/** Inferred type of {@link SharedSessionSchema}. */
export type SharedSession = z.infer<typeof SharedSessionSchema>;
