import { defineEvent } from "./definition.js";
import {
  RunStartedDataSchema, RunCompletedDataSchema, StepStartedDataSchema,
  StepCompletedDataSchema, ToolInvokedDataSchema, ToolCompletedDataSchema,
  ToolFailedDataSchema, ToolSelfCorrectingDataSchema, StepTypeChangedDataSchema,
  TokenStreamedDataSchema, TokenCountedDataSchema, ThinkingStartedDataSchema,
  ThinkingContentDataSchema, ThinkingCompletedDataSchema, ModelCostDataSchema,
  PermissionRequestedDataSchema, PermissionRepliedDataSchema,
  ContextCompressedDataSchema,
} from "../contracts/schema/run-event.js";

// ── Run events (durable, aggregate=runId) ──
export const RunStarted = defineEvent({
  type: "run.started",
  description: "A run has started",
  durable: { version: 1, aggregate: "runId" },
  schema: RunStartedDataSchema,
});

export const RunCompleted = defineEvent({
  type: "run.completed",
  description: "A run has completed",
  durable: { version: 1, aggregate: "runId" },
  schema: RunCompletedDataSchema,
});

export const StepStarted = defineEvent({
  type: "step.started",
  description: "A step has started",
  durable: { version: 1, aggregate: "runId" },
  schema: StepStartedDataSchema,
});

export const StepCompleted = defineEvent({
  type: "step.completed",
  description: "A step has completed",
  durable: { version: 1, aggregate: "runId" },
  schema: StepCompletedDataSchema,
});

export const ToolInvoked = defineEvent({
  type: "tool.invoked",
  description: "A tool was invoked",
  durable: { version: 1, aggregate: "runId" },
  schema: ToolInvokedDataSchema,
});

export const ToolCompleted = defineEvent({
  type: "tool.completed",
  description: "A tool completed successfully",
  durable: { version: 1, aggregate: "runId" },
  schema: ToolCompletedDataSchema,
});

export const ToolFailed = defineEvent({
  type: "tool.failed",
  description: "A tool failed",
  durable: { version: 1, aggregate: "runId" },
  schema: ToolFailedDataSchema,
});

export const ToolSelfCorrecting = defineEvent({
  type: "tool.self_correcting",
  description: "A tool failure triggered self-correction",
  schema: ToolSelfCorrectingDataSchema,
});

export const StepTypeChanged = defineEvent({
  type: "step.type_changed",
  description: "The active step type changed based on tool activity",
  schema: StepTypeChangedDataSchema,
});

export const TokenStreamed = defineEvent({
  type: "token.streamed",
  description: "Tokens were streamed (ephemeral)",
  schema: TokenStreamedDataSchema,
});

export const TokenCounted = defineEvent({
  type: "token.counted",
  description: "Token usage was counted for a model call",
  schema: TokenCountedDataSchema,
});

export const ThinkingStarted = defineEvent({
  type: "thinking.started",
  description: "Thinking started (ephemeral)",
  schema: ThinkingStartedDataSchema,
});

export const ThinkingContent = defineEvent({
  type: "thinking.content",
  description: "Thinking content (ephemeral)",
  schema: ThinkingContentDataSchema,
});

export const ThinkingCompleted = defineEvent({
  type: "thinking.completed",
  description: "Thinking completed",
  schema: ThinkingCompletedDataSchema,
});

export const PermissionRequested = defineEvent({
  type: "permission.requested",
  description: "Permission was requested",
  durable: { version: 1, aggregate: "runId" },
  schema: PermissionRequestedDataSchema,
});

export const PermissionReplied = defineEvent({
  type: "permission.replied",
  description: "Permission was replied to",
  durable: { version: 1, aggregate: "runId" },
  schema: PermissionRepliedDataSchema,
});

export const ModelCost = defineEvent({
  type: "model.cost",
  description: "LLM call cost calculated",
  schema: ModelCostDataSchema,
});

// ── System events (non-durable, broadcast-only) ──
export const FileChanged = defineEvent({
  type: "file.changed",
  description: "A file was changed on disk",
});

export const LspDiagnostics = defineEvent({
  type: "lsp.diagnostics",
  description: "LSP diagnostics updated",
});

export const McpToolsChanged = defineEvent({
  type: "mcp.tools.changed",
  description: "MCP server tools list changed",
});

export const ConfigChanged = defineEvent({
  type: "config.changed",
  description: "Configuration was changed",
});

export const SessionCreated = defineEvent({
  type: "session.created",
  description: "A new session was created",
});

export const QuestionAsked = defineEvent({
  type: "question.asked",
  description: "A question was asked to the user",
});

export const QuestionReplied = defineEvent({
  type: "question.replied",
  description: "A question was replied to",
});

export const VcsBranchChanged = defineEvent({
  type: "vcs.branch.changed",
  description: "VCS branch changed",
});

export const ContextCompressed = defineEvent({
  type: "context.compressed",
  description: "Context was compressed",
  durable: { version: 1, aggregate: "runId" },
  schema: ContextCompressedDataSchema,
});

// ── Webhook input events (trigger agent runs) ──
export const WebhookMessageReceived = defineEvent({
  type: "webhook.message.received",
  description: "A message was received via webhook",
});

export const WebhookHeartbeat = defineEvent({
  type: "webhook.heartbeat",
  description: "A heartbeat was received",
});

export const WebhookCronTick = defineEvent({
  type: "webhook.cron.tick",
  description: "A scheduled cron tick fired",
});

export const WebhookTriggered = defineEvent({
  type: "webhook.triggered",
  description: "A generic webhook was triggered",
});

export const WebhookSmsReceived = defineEvent({
  type: "webhook.sms.received",
  description: "An SMS message was received",
});
