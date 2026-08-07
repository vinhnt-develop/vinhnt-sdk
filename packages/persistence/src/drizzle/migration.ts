import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import Database from "better-sqlite3";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export type Migration = {
  id: string;
  up: (db: BetterSQLite3Database) => void;
};

export function createDb(dbPath: string): BetterSQLite3Database {
  const raw = new Database(dbPath);
  raw.pragma("journal_mode = WAL");
  raw.pragma("synchronous = NORMAL");
  raw.pragma("busy_timeout = 5000");
  raw.pragma("cache_size = -64000");
  raw.pragma("foreign_keys = ON");

  raw.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      time_completed INTEGER NOT NULL
    );
  `);

  return drizzle(raw);
}

export function applyMigrations(db: BetterSQLite3Database, migrations: Migration[]): void {
  const completed = db.all<{ id: string }>(sql`SELECT id FROM migrations ORDER BY id`);
  const completedSet = new Set(completed.map((r) => r.id));

  for (const m of migrations) {
    if (completedSet.has(m.id)) continue;
    db.transaction((tx) => {
      m.up(tx);
      tx.run(sql`INSERT INTO migrations (id, time_completed) VALUES (${m.id}, ${Date.now()})`);
    });
  }
}

export function runSqliteMigrations(db: BetterSQLite3Database, migrationsDir?: string): void {
  const dir = migrationsDir ?? join(fileURLToPath(new URL("../../../drizzle/migrations/sqlite", import.meta.url)));
  if (!existsSync(dir)) {
    pushSchema(db);
    return;
  }
  const completed = new Set(db.all<{ id: string }>(sql`SELECT id FROM migrations ORDER BY id`).map((r) => r.id));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const id = file.replace(/\.sql$/, "");
    if (completed.has(id)) continue;
    const sqlContent = readFileSync(join(dir, file), "utf-8");
    db.transaction((tx) => {
      const statements = sqlContent.split(";").map((s) => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        tx.run(sql.raw(stmt));
      }
      tx.run(sql`INSERT INTO migrations (id, time_completed) VALUES (${id}, ${Date.now()})`);
    });
  }
}

export function pushSchema(db: BetterSQLite3Database): void {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS event_sequence (
      aggregate_id TEXT NOT NULL PRIMARY KEY,
      seq INTEGER NOT NULL,
      owner_id TEXT
    );
  `);
  db.run(sql`
    CREATE TABLE IF NOT EXISTS run_events (
      id TEXT PRIMARY KEY,
      aggregate_id TEXT NOT NULL REFERENCES event_sequence(aggregate_id) ON DELETE CASCADE,
      seq INTEGER NOT NULL,
      type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      trace_id TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `);
  db.run(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS event_aggregate_seq_idx
      ON run_events(aggregate_id, seq);
  `);
  db.run(sql`
    CREATE INDEX IF NOT EXISTS event_aggregate_type_seq_idx
      ON run_events(aggregate_id, type, seq);
  `);
  db.run(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Session',
      parent_session_id TEXT,
      agent_id TEXT,
      model TEXT,
      cost REAL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      location_directory TEXT,
      location_workspace_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL
    );
  `);
  db.run(sql`
    CREATE INDEX IF NOT EXISTS session_updated_idx ON sessions(time_updated);
  `);
  db.run(sql`
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
      cost REAL,
      created_at TEXT NOT NULL
    );
  `);
  db.run(sql`
    CREATE INDEX IF NOT EXISTS msg_session_created_idx ON messages(session_id, created_at);
  `);
  // Migrate existing messages tables — add new columns
  try { db.run(sql`ALTER TABLE messages ADD COLUMN tokens_input INTEGER;`); } catch {}
  try { db.run(sql`ALTER TABLE messages ADD COLUMN tokens_output INTEGER;`); } catch {}
  try { db.run(sql`ALTER TABLE messages ADD COLUMN tokens_reasoning INTEGER;`); } catch {}
  try { db.run(sql`ALTER TABLE messages ADD COLUMN model TEXT;`); } catch {}
  try { db.run(sql`ALTER TABLE messages ADD COLUMN cost REAL;`); } catch {}
  db.run(sql`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL DEFAULT 'all',
      profile TEXT NOT NULL,
      capabilities TEXT NOT NULL,
      permissions TEXT,
      system_prompt TEXT,
      temperature REAL,
      parent_id TEXT,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL
    );
  `);
  db.run(sql`
    CREATE INDEX IF NOT EXISTS agent_parent_idx ON agents(parent_id);
  `);
  db.run(sql`
    CREATE TABLE IF NOT EXISTS permission_rules (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      effect TEXT NOT NULL DEFAULT 'allow',
      agent_id TEXT,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL
    );
  `);
  db.run(sql`
    CREATE INDEX IF NOT EXISTS perm_rule_run_idx ON permission_rules(run_id);
  `);
  db.run(sql`
    CREATE TABLE IF NOT EXISTS run_snapshots (
      aggregate_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      state TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      PRIMARY KEY (aggregate_id, seq)
    );
  `);
  db.run(sql`
    CREATE INDEX IF NOT EXISTS snapshot_aggregate_idx ON run_snapshots(aggregate_id);
  `);
  db.run(sql`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      password TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
  `);
  db.run(sql`
    CREATE INDEX IF NOT EXISTS share_session_idx ON shares(session_id);
  `);
  db.run(sql`
    CREATE TABLE IF NOT EXISTS saved_approvals (
      id TEXT PRIMARY KEY,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      agent_id TEXT,
      denied INTEGER NOT NULL DEFAULT 0,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL
    );
  `);
  db.run(sql`
    CREATE INDEX IF NOT EXISTS approval_resource_idx ON saved_approvals(resource, action);
  `);
}
