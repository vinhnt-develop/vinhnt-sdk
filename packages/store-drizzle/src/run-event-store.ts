import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq, and, gt, sql, desc, lte } from "drizzle-orm";
import type { RunEvent, RunId, RunEventListener, RunEventStore, RunEventSnapshot, SessionUpdates } from "@vinhnt-sdk/schema";
import { RunEventTable, RunSnapshotTable } from "./schema.js";
import { createDb, pushSchema } from "./migration.js";

/**
 * SQLite-backed {@link RunEventStore} via Drizzle ORM.
 *
 * Sequence allocation and event append are performed inside a single
 * transaction; duplicate event ids are ignored (idempotent).
 */
/** SQLite-backed {@link RunEventStore} with sequence + snapshot support. */
export class DrizzleRunEventStore implements RunEventStore {
  private readonly db: BetterSQLite3Database;
  private listeners = new Set<RunEventListener>();

  constructor(dbPath: string) {
    this.db = createDb(dbPath);
    pushSchema(this.db);
  }

  subscribe(listener: RunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: RunEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener errors must not break the event pipeline
      }
    }
  }

  async exists(eventId: string): Promise<boolean> {
    const row = this.db.select({ id: RunEventTable.id }).from(RunEventTable).where(eq(RunEventTable.id, eventId)).get();
    return !!row;
  }

  async getNextSequence(aggregateId: string): Promise<number> {
    const row = this.db
      .select({ seq: sql<number>`seq` })
      .from(sql`event_sequence`)
      .where(sql`aggregate_id = ${aggregateId}`)
      .get();
    return ((row?.seq as number | undefined) ?? 0) + 1;
  }

  async append(event: RunEvent): Promise<void> {
    if (event.persist === false) {
      this.notify(event);
      return;
    }
    this.db.transaction((tx) => {
      tx.run(
        sql`INSERT INTO event_sequence (aggregate_id, seq) VALUES (${event.runId}, ${event.sequence})
            ON CONFLICT(aggregate_id) DO UPDATE SET seq = ${event.sequence}`,
      );
      tx.run(
        sql`INSERT OR IGNORE INTO run_events (id, aggregate_id, seq, type, occurred_at, trace_id, data)
            VALUES (${event.id}, ${event.runId}, ${event.sequence}, ${event.type}, ${event.occurredAt}, ${event.traceId}, ${JSON.stringify(event.data)})`,
      );
    });
    this.notify(event);
  }

  async appendWithSequence(event: RunEvent): Promise<number> {
    if (event.persist === false) {
      this.notify(event);
      return 0;
    }
    const existing = this.db.select({ seq: RunEventTable.seq }).from(RunEventTable).where(eq(RunEventTable.id, event.id)).get();
    if (existing) {
      return existing.seq;
    }

    // Allocate and insert inside a single transaction. The sequence counter is
    // incremented atomically (`seq = seq + 1`) under the transaction lock, so
    // two concurrent appends can never observe the same value — the previous
    // read-then-blind-write pair could duplicate or silently drop events.
    const seq = this.db.transaction(() => {
      const bumped = this.db.get(
        sql`INSERT INTO event_sequence (aggregate_id, seq) VALUES (${event.runId}, 1)
            ON CONFLICT(aggregate_id) DO UPDATE SET seq = event_sequence.seq + 1
            RETURNING seq`,
      ) as { seq: number } | undefined;
      const next = bumped?.seq ?? 1;
      this.db.run(
        sql`INSERT OR IGNORE INTO run_events (id, aggregate_id, seq, type, occurred_at, trace_id, data)
            VALUES (${event.id}, ${event.runId}, ${next}, ${event.type}, ${event.occurredAt}, ${event.traceId}, ${JSON.stringify(event.data)})`,
      );
      return next;
    });

    this.notify({ ...event, sequence: seq } as RunEvent);
    return seq;
  }

  async appendTransactional(
    event: RunEvent,
    sessionUpdate?: { sessionId: string; updates: SessionUpdates },
  ): Promise<void> {
    if (event.persist === false) {
      this.notify(event);
      return;
    }
    this.db.transaction((tx) => {
      tx.run(
        sql`INSERT INTO event_sequence (aggregate_id, seq) VALUES (${event.runId}, ${event.sequence})
            ON CONFLICT(aggregate_id) DO UPDATE SET seq = ${event.sequence}`,
      );
      tx.run(
        sql`INSERT OR IGNORE INTO run_events (id, aggregate_id, seq, type, occurred_at, trace_id, data)
            VALUES (${event.id}, ${event.runId}, ${event.sequence}, ${event.type}, ${event.occurredAt}, ${event.traceId}, ${JSON.stringify(event.data)})`,
      );
      if (sessionUpdate) {
        const { sessionId, updates } = sessionUpdate;
        const setClauses: string[] = [];
        if (updates.title !== undefined) setClauses.push(`title = '${updates.title.replace(/'/g, "''")}'`);
        if (updates.isActive !== undefined) setClauses.push(`is_active = ${updates.isActive ? 1 : 0}`);
        if (updates.model !== undefined) setClauses.push(`model = '${updates.model.replace(/'/g, "''")}'`);
        if (updates.cost !== undefined) setClauses.push(`cost = ${updates.cost}`);
        if (updates.inputTokens !== undefined) setClauses.push(`input_tokens = ${updates.inputTokens}`);
        if (updates.outputTokens !== undefined) setClauses.push(`output_tokens = ${updates.outputTokens}`);
        if (updates.agentId !== undefined) setClauses.push(`agent_id = '${updates.agentId.replace(/'/g, "''")}'`);
        if (setClauses.length > 0) {
          tx.run(sql.raw(`UPDATE sessions SET ${setClauses.join(", ")} WHERE id = '${sessionId.replace(/'/g, "''")}'`));
        }
      }
    });
    this.notify(event);
  }

  async list(runId: string, afterSequence?: number): Promise<readonly RunEvent[]> {
    const conditions = [eq(RunEventTable.aggregateId, runId as RunId)];
    if (afterSequence !== undefined) {
      conditions.push(gt(RunEventTable.seq, afterSequence));
    }
    const rows = this.db
      .select()
      .from(RunEventTable)
      .where(and(...conditions))
      .orderBy(RunEventTable.seq)
      .all();

    return rows.map((row) => ({
      id: row.id,
      runId: row.aggregateId,
      sequence: row.seq,
      type: row.type,
      occurredAt: row.occurredAt,
      traceId: row.traceId,
      data: row.data,
    }));
  }

  async saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void> {
    const maxSeq = this.db
      .select({ seq: RunEventTable.seq })
      .from(RunEventTable)
      .where(eq(RunEventTable.aggregateId, runId as RunId))
      .orderBy(desc(RunEventTable.seq))
      .limit(1)
      .all()[0]?.seq ?? 0;

    this.db
      .insert(RunSnapshotTable)
      .values({
        aggregateId: runId as RunId,
        seq: maxSeq,
        state,
        occurredAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [RunSnapshotTable.aggregateId, RunSnapshotTable.seq],
        set: { state, occurredAt: new Date().toISOString() },
      })
      .run();
  }

  async getSnapshot(runId: string): Promise<RunEventSnapshot | null> {
    const rows = this.db
      .select()
      .from(RunSnapshotTable)
      .where(eq(RunSnapshotTable.aggregateId, runId as RunId))
      .orderBy(desc(RunSnapshotTable.seq))
      .limit(1)
      .all();
    const row = rows[0];
    if (!row) return null;
    return { runId, sequence: row.seq, state: row.state, occurredAt: row.occurredAt };
  }

  async getSnapshotAfterSequence(runId: string, sequence: number): Promise<RunEventSnapshot | null> {
    const rows = this.db
      .select()
      .from(RunSnapshotTable)
      .where(
        and(
          eq(RunSnapshotTable.aggregateId, runId as RunId),
          lte(RunSnapshotTable.seq, sequence),
        ),
      )
      .orderBy(desc(RunSnapshotTable.seq))
      .limit(1)
      .all();
    const row = rows[0];
    if (!row) return null;
    return { runId, sequence: row.seq, state: row.state, occurredAt: row.occurredAt };
  }
}
