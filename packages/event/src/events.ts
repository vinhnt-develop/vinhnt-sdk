import { defineEvent } from "./definition.js";
import {
  RunStartedDataSchema, RunCompletedDataSchema, StepStartedDataSchema,
  StepCompletedDataSchema, StepFailedDataSchema, ToolInvokedDataSchema, ToolCompletedDataSchema,
  ToolFailedDataSchema, ToolSelfCorrectingDataSchema, StepTypeChangedDataSchema,
  TokenStreamedDataSchema, TokenCountedDataSchema, ThinkingStartedDataSchema,
  ThinkingContentDataSchema, ThinkingCompletedDataSchema, ModelCostDataSchema,
  PermissionRequestedDataSchema, PermissionRepliedDataSchema,
  ContextCompressedDataSchema,
} from "@vinhnt-sdk/schema";

// ── Run events (durable, aggregate=runId) ──
/** Event definition for `run.started` — A run has started. */
export const RunStarted = defineEvent({
  type: "run.started",
  description: "A run has started",
  durable: { version: 1, aggregate: "runId" },
  schema: RunStartedDataSchema,
});

/** Event definition for `run.completed` — A run has completed. */
export const RunCompleted = defineEvent({
  type: "run.completed",
  description: "A run has completed",
  durable: { version: 1, aggregate: "runId" },
  schema: RunCompletedDataSchema,
});

/** Event definition for `step.started` — A step has started. */
export const StepStarted = defineEvent({
  type: "step.started",
  description: "A step has started",
  durable: { version: 1, aggregate: "runId" },
  schema: StepStartedDataSchema,
});

/** Event definition for `step.completed` — A step has completed. */
export const StepCompleted = defineEvent({
  type: "step.completed",
  description: "A step has completed",
  durable: { version: 1, aggregate: "runId" },
  schema: StepCompletedDataSchema,
});

/** Event definition for `step.failed` — A step failed (e.g. timed out) without failing the whole run. */
export const StepFailed = defineEvent({
  type: "step.failed",
  description: "A step failed (e.g. timed out) without failing the whole run",
  durable: { version: 1, aggregate: "runId" },
  schema: StepFailedDataSchema,
});

/** Event definition for `tool.invoked` — A tool was invoked. */
export const ToolInvoked = defineEvent({
  type: "tool.invoked",
  description: "A tool was invoked",
  durable: { version: 1, aggregate: "runId" },
  schema: ToolInvokedDataSchema,
});

/** Event definition for `tool.completed` — A tool completed successfully. */
export const ToolCompleted = defineEvent({
  type: "tool.completed",
  description: "A tool completed successfully",
  durable: { version: 1, aggregate: "runId" },
  schema: ToolCompletedDataSchema,
});

/** Event definition for `tool.failed` — A tool failed. */
export const ToolFailed = defineEvent({
  type: "tool.failed",
  description: "A tool failed",
  durable: { version: 1, aggregate: "runId" },
  schema: ToolFailedDataSchema,
});

/** Event definition for `tool.self_correcting` — A tool failure triggered self-correction. */
export const ToolSelfCorrecting = defineEvent({
  type: "tool.self_correcting",
  description: "A tool failure triggered self-correction",
  schema: ToolSelfCorrectingDataSchema,
});

/** Event definition for `step.type_changed` — The active step type changed based on tool activity. */
export const StepTypeChanged = defineEvent({
  type: "step.type_changed",
  description: "The active step type changed based on tool activity",
  schema: StepTypeChangedDataSchema,
});

/** Event definition for `token.streamed` — Tokens were streamed (ephemeral). */
export const TokenStreamed = defineEvent({
  type: "token.streamed",
  description: "Tokens were streamed (ephemeral)",
  schema: TokenStreamedDataSchema,
});

/** Event definition for `token.counted` — Token usage was counted for a model call. */
export const TokenCounted = defineEvent({
  type: "token.counted",
  description: "Token usage was counted for a model call",
  schema: TokenCountedDataSchema,
});

/** Event definition for `thinking.started` — Thinking started (ephemeral). */
export const ThinkingStarted = defineEvent({
  type: "thinking.started",
  description: "Thinking started (ephemeral)",
  schema: ThinkingStartedDataSchema,
});

/** Event definition for `thinking.content` — Thinking content (ephemeral). */
export const ThinkingContent = defineEvent({
  type: "thinking.content",
  description: "Thinking content (ephemeral)",
  schema: ThinkingContentDataSchema,
});

/** Event definition for `thinking.completed` — Thinking completed. */
export const ThinkingCompleted = defineEvent({
  type: "thinking.completed",
  description: "Thinking completed",
  schema: ThinkingCompletedDataSchema,
});

/** Event definition for `permission.requested` — Permission was requested. */
export const PermissionRequested = defineEvent({
  type: "permission.requested",
  description: "Permission was requested",
  durable: { version: 1, aggregate: "runId" },
  schema: PermissionRequestedDataSchema,
});

/** Event definition for `permission.replied` — Permission was replied to. */
export const PermissionReplied = defineEvent({
  type: "permission.replied",
  description: "Permission was replied to",
  durable: { version: 1, aggregate: "runId" },
  schema: PermissionRepliedDataSchema,
});

/** Event definition for `model.cost` — LLM call cost calculated. */
export const ModelCost = defineEvent({
  type: "model.cost",
  description: "LLM call cost calculated",
  schema: ModelCostDataSchema,
});

// ── System events (non-durable, broadcast-only) ──
/** Event definition for `file.changed` — A file was changed on disk. */
export const FileChanged = defineEvent({
  type: "file.changed",
  description: "A file was changed on disk",
});

/** Event definition for `lsp.diagnostics` — LSP diagnostics updated. */
export const LspDiagnostics = defineEvent({
  type: "lsp.diagnostics",
  description: "LSP diagnostics updated",
});

/** Event definition for `mcp.tools.changed` — MCP server tools list changed. */
export const McpToolsChanged = defineEvent({
  type: "mcp.tools.changed",
  description: "MCP server tools list changed",
});

/** Event definition for `config.changed` — Configuration was changed. */
export const ConfigChanged = defineEvent({
  type: "config.changed",
  description: "Configuration was changed",
});

/** Event definition for `session.created` — A new session was created. */
export const SessionCreated = defineEvent({
  type: "session.created",
  description: "A new session was created",
});

/** Event definition for `question.asked` — A question was asked to the user. */
export const QuestionAsked = defineEvent({
  type: "question.asked",
  description: "A question was asked to the user",
});

/** Event definition for `question.replied` — A question was replied to. */
export const QuestionReplied = defineEvent({
  type: "question.replied",
  description: "A question was replied to",
});

/** Event definition for `vcs.branch.changed` — VCS branch changed. */
export const VcsBranchChanged = defineEvent({
  type: "vcs.branch.changed",
  description: "VCS branch changed",
});

/** Event definition for `context.compressed` — Context was compressed. */
export const ContextCompressed = defineEvent({
  type: "context.compressed",
  description: "Context was compressed",
  durable: { version: 1, aggregate: "runId" },
  schema: ContextCompressedDataSchema,
});

// ── Webhook input events (trigger agent runs) ──
/** Event definition for `webhook.message.received` — A message was received via webhook. */
export const WebhookMessageReceived = defineEvent({
  type: "webhook.message.received",
  description: "A message was received via webhook",
});

/** Event definition for `webhook.heartbeat` — A heartbeat was received. */
export const WebhookHeartbeat = defineEvent({
  type: "webhook.heartbeat",
  description: "A heartbeat was received",
});

/** Event definition for `webhook.cron.tick` — A scheduled cron tick fired. */
export const WebhookCronTick = defineEvent({
  type: "webhook.cron.tick",
  description: "A scheduled cron tick fired",
});

/** Event definition for `webhook.triggered` — A generic webhook was triggered. */
export const WebhookTriggered = defineEvent({
  type: "webhook.triggered",
  description: "A generic webhook was triggered",
});

/** Event definition for `webhook.sms.received` — An SMS message was received. */
export const WebhookSmsReceived = defineEvent({
  type: "webhook.sms.received",
  description: "An SMS message was received",
});
