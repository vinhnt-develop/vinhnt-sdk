import { z } from "zod";

// JSON-RPC 2.0 base
export const JsonRpcId = z.union([z.string(), z.number(), z.null()]);

export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: JsonRpcId,
  method: z.string(),
  params: z.unknown().optional(),
});

export const JsonRpcNotificationSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.unknown().optional(),
});

export const JsonRpcSuccessSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: JsonRpcId,
  result: z.unknown(),
});

export const JsonRpcErrorSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: JsonRpcId,
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }),
});

// --- ACP Method Schemas ---

// session/create (Editor → Agent)
export const SessionCreateParamsSchema = z.object({
  clientId: z.string().min(1),
  clientName: z.string().optional(),
  clientVersion: z.string().optional(),
  capabilities: z.object({
    theme: z.enum(["light", "dark", "high-contrast"]).optional(),
    languages: z.array(z.string()).optional(),
    supportsMarkdown: z.boolean().optional(),
    supportsCodeBlocks: z.boolean().optional(),
    supportsImages: z.boolean().optional(),
    supportsFiles: z.boolean().optional(),
    platform: z.enum(["vscode", "browser", "jetbrains", "neovim", "cli", "other"]).optional(),
  }).optional(),
});

export const SessionCreateResultSchema = z.object({
  sessionId: z.string(),
  serverVersion: z.string(),
  capabilities: z.object({
    supportsStreaming: z.boolean(),
    supportsToolCalls: z.boolean(),
    supportsFileOps: z.boolean(),
    maxMessageLength: z.number().optional(),
  }),
});

// task/start (Editor → Agent)
export const TaskStartParamsSchema = z.object({
  sessionId: z.string(),
  prompt: z.string().min(1),
  model: z.string().optional(),
  maxSteps: z.number().int().min(1).max(100).optional(),
  autoApproval: z.boolean().optional(),
  files: z.array(z.string()).optional(),
});

export const TaskStartResultSchema = z.object({
  taskId: z.string(),
  runId: z.string(),
  status: z.enum(["queued", "running"]),
});

// task/cancel (Editor → Agent)
export const TaskCancelParamsSchema = z.object({
  taskId: z.string(),
  reason: z.string().optional(),
});

export const TaskCancelResultSchema = z.object({
  ok: z.boolean(),
});

// task/stream notification (Agent → Editor)
export const TaskStreamNotificationSchema = z.object({
  taskId: z.string(),
  type: z.enum([
    "message", "tool_call", "tool_result", "diff",
    "error", "done", "status", "token",
  ]),
  data: z.unknown(),
});

// task/result (Agent → Editor, response to task/start request)
export const TaskResultSchema = z.object({
  taskId: z.string(),
  status: z.enum(["completed", "failed", "cancelled"]),
  summary: z.string().optional(),
  error: z.string().optional(),
  events: z.array(z.unknown()).optional(),
});

// editor/file (Editor → Agent) - for agent to request file read/write
export const FileOperationParamsSchema = z.object({
  taskId: z.string(),
  operation: z.enum(["read", "write", "search"]),
  path: z.string(),
  content: z.string().optional(),
});

export const FileOperationResultSchema = z.object({
  content: z.string().optional(),
  exists: z.boolean().optional(),
  error: z.string().optional(),
});

// ping
export const PingParamsSchema = z.object({}).optional();
export const PingResultSchema = z.object({
  timestamp: z.number(),
});

// --- Inferred types ---
export type SessionCreateParams = z.infer<typeof SessionCreateParamsSchema>;
export type SessionCreateResult = z.infer<typeof SessionCreateResultSchema>;
export type TaskStartParams = z.infer<typeof TaskStartParamsSchema>;
export type TaskStartResult = z.infer<typeof TaskStartResultSchema>;
export type TaskCancelParams = z.infer<typeof TaskCancelParamsSchema>;
export type TaskStreamNotification = z.infer<typeof TaskStreamNotificationSchema>;
export type TaskResult = z.infer<typeof TaskResultSchema>;
export type FileOperationParams = z.infer<typeof FileOperationParamsSchema>;
export type FileOperationResult = z.infer<typeof FileOperationResultSchema>;

// --- ACP error codes ---
export const AcpErrorCodes = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  SessionNotFound: -32000,
  TaskNotFound: -32001,
  TaskAlreadyRunning: -32002,
  Unauthorized: -32010,
} as const;

// --- ACP Method names ---
export const AcpMethods = {
  SessionCreate: "session/create",
  TaskStart: "task/start",
  TaskCancel: "task/cancel",
  Ping: "ping",
  FileRead: "file/read",
  FileWrite: "file/write",
} as const;
