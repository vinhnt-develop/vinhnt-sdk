import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

export type PgDb = NodePgDatabase<typeof schema>;

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS event_sequence (
  aggregate_id TEXT PRIMARY KEY,
  seq INTEGER NOT NULL,
  owner_id TEXT
);

CREATE TABLE IF NOT EXISTS run_events (
  id TEXT PRIMARY KEY,
  aggregate_id TEXT NOT NULL REFERENCES event_sequence(aggregate_id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  trace_id TEXT NOT NULL,
  data JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS event_aggregate_seq_idx ON run_events(aggregate_id, seq);
CREATE INDEX IF NOT EXISTS event_aggregate_type_seq_idx ON run_events(aggregate_id, type, seq);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Session',
  parent_session_id TEXT,
  agent_id TEXT,
  model TEXT,
  cost DOUBLE PRECISION,
  input_tokens INTEGER,
  output_tokens INTEGER,
  location_directory TEXT,
  location_workspace_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS session_updated_idx ON sessions(updated_at);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_call_id TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_reasoning INTEGER,
  model TEXT,
  cost DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS msg_session_created_idx ON messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  time_completed TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS run_snapshots (
  aggregate_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  state JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (aggregate_id, seq)
);

CREATE INDEX IF NOT EXISTS snapshot_aggregate_idx ON run_snapshots(aggregate_id);
`;

/**
 * Create a Drizzle client over a Postgres connection string.
 */
export function createPgDb(connectionString: string): PgDb {
  const pool = new pg.Pool({ connectionString });
  return drizzle(pool, { schema }) as PgDb;
}

/**
 * Create a Postgres connection pool.
 */
export function getPgPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: 10 });
}

/**
 * Idempotently create all tables and indexes for the current schema.
 * Fast path for development and tests (no migration files required).
 */
export async function pushPgSchema(pool: pg.Pool): Promise<void> {
  await pool.query(CREATE_TABLES_SQL);
}

export async function pushPgSchemaFromConnection(connectionString: string): Promise<void> {
  const pool = new pg.Pool({ connectionString });
  try {
    await pushPgSchema(pool);
  } finally {
    await pool.end();
  }
}