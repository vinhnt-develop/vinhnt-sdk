import { z } from "zod";

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const RunResultSchema = z.object({
  runId: z.string(),
  statusUrl: z.string(),
  eventsUrl: z.string(),
  queued: z.boolean().optional(),
});

export type RunResult = z.infer<typeof RunResultSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const CreateShareSchema = z.object({
  sessionId: z.string().min(1),
  ttlHours: z.number().int().min(1).max(720).default(168),  // default 7 days
  password: z.string().optional(),
});

export type CreateShare = z.infer<typeof CreateShareSchema>;

export const ShareResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  sessionId: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  passwordProtected: z.boolean(),
});

export type ShareResponse = z.infer<typeof ShareResponseSchema>;

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

export type SharedSession = z.infer<typeof SharedSessionSchema>;
