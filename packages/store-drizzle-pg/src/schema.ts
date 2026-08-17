import { pgTable, text, integer, doublePrecision, boolean, jsonb, timestamp, uniqueIndex, index, primaryKey } from "drizzle-orm/pg-core";
import type { RunId, TraceId, SessionId, MessageId } from "@vinhnt-sdk/schema";

export const PgEventSequenceTable = pgTable("event_sequence", {
  aggregateId: text("aggregate_id").$type<RunId>().notNull().primaryKey(),
  seq: integer().notNull(),
  ownerId: text("owner_id"),
});

export const PgRunEventTable = pgTable("run_events", {
  id: text().primaryKey(),
  aggregateId: text("aggregate_id").$type<RunId>().notNull().references(() => PgEventSequenceTable.aggregateId, { onDelete: "cascade" }),
  seq: integer().notNull(),
  type: text().notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  traceId: text("trace_id").$type<TraceId>().notNull(),
  data: jsonb().$type<Record<string, unknown>>().notNull(),
}, (table) => [
  uniqueIndex("event_aggregate_seq_idx").on(table.aggregateId, table.seq),
  index("event_aggregate_type_seq_idx").on(table.aggregateId, table.type, table.seq),
]);

export const PgRunSnapshotTable = pgTable("run_snapshots", {
  aggregateId: text("aggregate_id").$type<RunId>().notNull(),
  seq: integer().notNull(),
  state: jsonb().$type<Record<string, unknown>>().notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.aggregateId, table.seq] }),
  aggregateIdx: index("snapshot_aggregate_idx").on(table.aggregateId),
}));

export const PgSessionTable = pgTable("sessions", {
  id: text().$type<SessionId>().primaryKey(),
  title: text().notNull().default("New Session"),
  parentSessionId: text("parent_session_id").$type<SessionId>(),
  agentId: text("agent_id"),
  model: text(),
  cost: doublePrecision(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  locationDirectory: text("location_directory"),
  locationWorkspaceId: text("location_workspace_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("session_updated_idx").on(table.updatedAt),
]);

export const PgMessageTable = pgTable("messages", {
  id: text().$type<MessageId>().primaryKey(),
  sessionId: text("session_id").$type<SessionId>().notNull().references(() => PgSessionTable.id, { onDelete: "cascade" }),
  role: text().notNull(),
  content: text().notNull(),
  toolCallId: text("tool_call_id"),
  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),
  tokensReasoning: integer("tokens_reasoning"),
  model: text(),
  cost: doublePrecision(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("msg_session_created_idx").on(table.sessionId, table.createdAt),
]);

export const PgMigrationTable = pgTable("migrations", {
  id: text().primaryKey(),
  timeCompleted: timestamp("time_completed", { withTimezone: true }).notNull().defaultNow(),
});