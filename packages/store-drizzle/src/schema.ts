import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import type { RunId, TraceId, SessionId, MessageId } from "@vinhnt-sdk/schema";

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

export const RunSnapshotTable = sqliteTable("run_snapshots", {
  aggregateId: text("aggregate_id").$type<RunId>().notNull(),
  seq: integer().notNull(),
  state: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
  occurredAt: text("occurred_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.aggregateId, table.seq] }),
  aggregateIdx: index("snapshot_aggregate_idx").on(table.aggregateId),
}));

export const SessionTable = sqliteTable("sessions", {
  id: text().$type<SessionId>().primaryKey(),
  title: text().notNull().default("New Session"),
  parentSessionId: text("parent_session_id").$type<SessionId>(),
  agentId: text("agent_id"),
  model: text(),
  cost: real(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  locationDirectory: text("location_directory"),
  locationWorkspaceId: text("location_workspace_id"),
  isActive: integer("is_active").notNull().default(1),
  timeCreated: integer("time_created").notNull().$default(() => Date.now()),
  timeUpdated: integer("time_updated").notNull().$default(() => Date.now()),
}, (table) => [
  index("session_updated_idx").on(table.timeUpdated),
]);

export const MessageTable = sqliteTable("messages", {
  id: text().$type<MessageId>().primaryKey(),
  sessionId: text("session_id").$type<SessionId>().notNull().references(() => SessionTable.id, { onDelete: "cascade" }),
  role: text().notNull(),
  content: text().notNull(),
  toolCallId: text("tool_call_id"),
  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),
  tokensReasoning: integer("tokens_reasoning"),
  model: text(),
  cost: real(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("msg_session_created_idx").on(table.sessionId, table.createdAt),
]);

export const MigrationTable = sqliteTable("migrations", {
  id: text().primaryKey(),
  timeCompleted: integer("time_completed").notNull().$default(() => Date.now()),
});
