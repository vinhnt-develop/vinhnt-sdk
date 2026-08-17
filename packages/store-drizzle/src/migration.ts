import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import Database from "better-sqlite3";

/** A named migration applied once, transactionally. */
export type Migration = {
  id: string;
  up: (db: BetterSQLite3Database) => void;
};

/**
 * Open (or create) a SQLite database and apply engine pragmas.
 */
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

/**
 * Apply a list of migrations transactionally, tracking them in the
 * `migrations` table.
 */
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

/**
 * Idempotently create all tables and indexes for the current schema.
 * Fast path for development and tests (no migration files required).
 */
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
}
