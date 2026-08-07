export type { RunEventStore, SessionStore, AgentRegistry } from "@vinhnt-sdk/agent-core";
export type { PermissionStore } from "@vinhnt-sdk/agent-core";

// Drizzle ORM stores (SQLite)
export { DrizzleRunEventStore } from "./drizzle/run-event-store.js";
export { DrizzleSessionStore } from "./drizzle/session-store.js";
export { DrizzleAgentStore } from "./drizzle/agent-store.js";
export { DrizzlePermissionStore } from "./drizzle/permission-store.js";
export { DrizzleSavedApprovalStore } from "./drizzle/saved-approval-store.js";
export { DrizzleApprovalStore } from "./drizzle/drizzle-approval-store.js";
export { DrizzleShareStore } from "./drizzle/share-store.js";
export type { ShareRecord } from "./drizzle/share-store.js";

// Drizzle ORM stores (PostgreSQL)
export { DrizzlePgRunEventStore } from "./drizzle/pg-run-event-store.js";
export { DrizzlePgSessionStore } from "./drizzle/pg-session-store.js";
export { DrizzlePgAgentStore } from "./drizzle/pg-agent-store.js";
export { DrizzlePgPermissionStore } from "./drizzle/pg-permission-store.js";
export { DrizzlePgShareStore } from "./drizzle/pg-share-store.js";

// Migration helpers
export { createDb, applyMigrations, runSqliteMigrations, pushSchema } from "./drizzle/migration.js";
export { createPgDb, pushPgSchema, runPgMigrations } from "./drizzle/pg-migration.js";
export type { Migration } from "./drizzle/migration.js";
