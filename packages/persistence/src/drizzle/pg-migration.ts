import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./pg-schema.js";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS session_updated_idx ON sessions(time_updated);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS msg_session_created_idx ON messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  mode TEXT DEFAULT 'all',
  profile JSONB NOT NULL,
  capabilities JSONB NOT NULL,
  permissions JSONB,
  system_prompt TEXT,
  temperature DOUBLE PRECISION,
  parent_id TEXT,
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_parent_idx ON agents(parent_id);

CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  time_completed TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permission_rules (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  effect TEXT NOT NULL DEFAULT 'allow',
  agent_id TEXT,
  time_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS perm_rule_run_idx ON permission_rules(run_id);

CREATE TABLE IF NOT EXISTS run_snapshots (
  aggregate_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  state JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (aggregate_id, seq)
);

CREATE INDEX IF NOT EXISTS snapshot_aggregate_idx ON run_snapshots(aggregate_id);

CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS share_session_idx ON shares(session_id);
`;

export function createPgDb(connectionString: string): NodePgDatabase<typeof schema> {
  const pool = new pg.Pool({ connectionString });
  return drizzle(pool, { schema }) as NodePgDatabase<typeof schema>;
}

export async function runPgMigrations(
  pool: pg.Pool,
  migrationsDir?: string,
): Promise<void> {
  const dir = migrationsDir ?? join(fileURLToPath(new URL("../../../drizzle/migrations/postgres", import.meta.url)));
  if (!existsSync(dir)) {
    await pushPgSchemaFromPool(pool);
    return;
  }
  const { rows: completedRows } = await pool.query("SELECT id FROM migrations");
  const completed = new Set(completedRows.map((r: { id: string }) => r.id));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const id = file.replace(/\.sql$/, "");
    if (completed.has(id)) continue;
    const sqlContent = readFileSync(join(dir, file), "utf-8");
    await pool.query(sqlContent);
    await pool.query("INSERT INTO migrations (id) VALUES ($1)", [id]);
  }
}

async function pushPgSchemaFromPool(pool: pg.Pool): Promise<void> {
  await pool.query(CREATE_TABLES_SQL);
}

export async function pushPgSchema(connectionString: string): Promise<void> {
  const pool = new pg.Pool({ connectionString });
  try {
    await pool.query(CREATE_TABLES_SQL);
  } finally {
    await pool.end();
  }
}

export function getPgPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: 10 });
}
