import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import type { RunId, TraceId, SessionId, MessageId, ToolCallId, AgentId } from "@vinhnt-sdk/schema";
import { Timestamps } from "./timestamps.js";

export const EventSequenceTable = sqliteTable("event_sequence", {
  aggregateId: text("aggregate_id").$type<RunId>().notNull().primaryKey(),
  seq: integer().notNull(),
  ownerId: text("owner_id"),
});

export const RunEventTable = sqliteTable("run_events", {
  id: text().primaryKey(),
  aggregateId: text("aggregate_id").$type<RunId>().notNull().references(() => EventSequenceTable.aggregateId, { onDelete: "cascade" }),
  seq: integer().notNull(),
  type: text().notNull(),
  occurredAt: text("occurred_at").notNull(),
  traceId: text("trace_id").$type<TraceId>().notNull(),
  data: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
}, (table) => [
  uniqueIndex("event_aggregate_seq_idx").on(table.aggregateId, table.seq),
  index("event_aggregate_type_seq_idx").on(table.aggregateId, table.type, table.seq),
]);

export const SessionTable = sqliteTable("sessions", {
  id: text().$type<SessionId>().primaryKey(),
  title: text().notNull().default("New Session"),
  parentSessionId: text("parent_session_id").$type<SessionId>(),
  agentId: text("agent_id").$type<AgentId>(),
  model: text(),
  cost: real(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  locationDirectory: text("location_directory"),
  locationWorkspaceId: text("location_workspace_id"),
  isActive: integer("is_active").notNull().default(1),
  ...Timestamps,
}, (table) => [
  index("session_updated_idx").on(table.time_updated),
]);

export const MessageTable = sqliteTable("messages", {
  id: text().$type<MessageId>().primaryKey(),
  sessionId: text("session_id").$type<SessionId>().notNull().references(() => SessionTable.id, { onDelete: "cascade" }),
  role: text().notNull(),
  content: text().notNull(),
  toolCallId: text("tool_call_id").$type<ToolCallId>(),
  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),
  tokensReasoning: integer("tokens_reasoning"),
  model: text(),
  cost: real(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("msg_session_created_idx").on(table.sessionId, table.createdAt),
]);

export const AgentTable = sqliteTable("agents", {
  id: text().$type<AgentId>().primaryKey(),
  mode: text().$type<"primary" | "subagent" | "all">().default("all"),
  profile: text({ mode: "json" }).$type<{ name: string; description: string; version?: string; author?: string; hidden?: boolean }>().notNull(),
  capabilities: text({ mode: "json" }).$type<{ tools?: string[]; models?: string[]; maxTokens?: number; streaming?: boolean; thinking?: boolean }>().notNull(),
  permissions: text({ mode: "json" }).$type<{ mode?: string; ruleset?: { rules?: { effect: string; target: string; reason?: string }[]; allowedRisks?: string[]; maxSteps?: number; maxTokens?: number; inheritFromParent?: boolean }; allowedTools?: string[]; deniedTools?: string[]; allowedRisks?: string[]; maxSteps?: number; maxTokens?: number }>(),
  systemPrompt: text("system_prompt"),
  temperature: real(),
  parentId: text("parent_id").$type<AgentId>(),
  ...Timestamps,
}, (table) => [
  index("agent_parent_idx").on(table.parentId),
]);

export const MigrationTable = sqliteTable("migrations", {
  id: text().primaryKey(),
  timeCompleted: integer("time_completed").notNull().$default(() => Date.now()),
});

export const RunSnapshotTable = sqliteTable("run_snapshots", {
  aggregateId: text("aggregate_id").$type<RunId>().notNull(),
  seq: integer().notNull(),
  state: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
  occurredAt: text("occurred_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.aggregateId, table.seq] }),
  aggregateIdx: index("snapshot_aggregate_idx").on(table.aggregateId),
}));

export const PermissionRuleTable = sqliteTable("permission_rules", {
  id: text().primaryKey(),
  runId: text("run_id").notNull(),
  action: text().notNull(),
  resource: text().notNull(),
  effect: text().notNull().default("allow"),
  agentId: text("agent_id"),
  ...Timestamps,
}, (table) => [
  index("perm_rule_run_idx").on(table.runId),
]);

export const ShareTable = sqliteTable("shares", {
  id: text().primaryKey(),
  sessionId: text("session_id").notNull(),
  password: text(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
}, (table) => [
  index("share_session_idx").on(table.sessionId),
]);

export const SavedApprovalTable = sqliteTable("saved_approvals", {
  id: text().primaryKey(),
  resource: text().notNull(),
  action: text().notNull(),
  agentId: text("agent_id"),
  denied: integer("denied").notNull().default(0),
  ...Timestamps,
}, (table) => [
  index("approval_resource_idx").on(table.resource, table.action),
]);
