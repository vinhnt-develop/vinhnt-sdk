import type { RunEvent, RunId } from "@vinhnt-sdk/schema";
import type { RunEventListener, RunEventStore, RunEventSnapshot, SessionUpdates } from "@vinhnt-sdk/core";
import { eq, and, gt, sql, desc, lte } from "drizzle-orm";
import { PgRunEventTable, PgRunSnapshotTable } from "./pg-schema.js";
import { PgStoreBase } from "./pg-base.js";

export class DrizzlePgRunEventStore extends PgStoreBase implements RunEventStore {
  private listeners = new Set<RunEventListener>();

  subscribe(listener: RunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: RunEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* ignore listener error */ }
    }
  }

  async getNextSequence(aggregateId: string): Promise<number> {
    const rows = await this.db
      .select({ seq: sql<number>`seq` })
      .from(sql`event_sequence`)
      .where(sql`aggregate_id = ${aggregateId}`);
    return (rows[0]?.seq as number ?? 0) + 1;
  }

  async exists(eventId: string): Promise<boolean> {
    const rows = await this.db.select({ id: PgRunEventTable.id }).from(PgRunEventTable).where(eq(PgRunEventTable.id, eventId)).limit(1);
    return rows.length > 0;
  }

  async append(event: RunEvent): Promise<void> {
    if (event.persist === false) {
      this.notify(event);
      return;
    }
    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO event_sequence (aggregate_id, seq) VALUES (${event.runId}, ${event.sequence})
            ON CONFLICT (aggregate_id) DO UPDATE SET seq = ${event.sequence}`,
      );
      // Idempotent: ON CONFLICT DO NOTHING for event insert
      await tx.execute(
        sql`INSERT INTO run_events (id, aggregate_id, seq, type, occurred_at, trace_id, data)
            VALUES (${event.id}, ${event.runId}, ${event.sequence}, ${event.type}, ${new Date(event.occurredAt)}, ${event.traceId}, ${event.data as Record<string, unknown>})
            ON CONFLICT (id) DO NOTHING`,
      );
    });
    this.notify(event);
  }

  async list(runId: string, afterSequence?: number): Promise<readonly RunEvent[]> {
    const conditions = [eq(PgRunEventTable.aggregateId, runId as RunId)];
    if (afterSequence !== undefined) {
      conditions.push(gt(PgRunEventTable.seq, afterSequence));
    }
    const rows = await this.db
      .select()
      .from(PgRunEventTable)
      .where(and(...conditions))
      .orderBy(PgRunEventTable.seq);

    return rows.map((row) => ({
      id: row.id,
      runId: row.aggregateId,
      sequence: row.seq,
      type: row.type,
      occurredAt: typeof row.occurredAt === "string" ? row.occurredAt : row.occurredAt.toISOString(),
      traceId: row.traceId,
      data: row.data,
    }));
  }

  async saveSnapshot(runId: string, state: Record<string, unknown>): Promise<void> {
    const rows = await this.db
      .select({ seq: PgRunEventTable.seq })
      .from(PgRunEventTable)
      .where(eq(PgRunEventTable.aggregateId, runId as RunId))
      .orderBy(desc(PgRunEventTable.seq))
      .limit(1);

    const maxSeq = rows[0]?.seq ?? 0;
    await this.db.insert(PgRunSnapshotTable).values({
      aggregateId: runId as RunId,
      seq: maxSeq,
      state,
      occurredAt: new Date(),
    });
  }

  async getSnapshot(runId: string): Promise<RunEventSnapshot | null> {
    const rows = await this.db
      .select()
      .from(PgRunSnapshotTable)
      .where(eq(PgRunSnapshotTable.aggregateId, runId as RunId))
      .orderBy(desc(PgRunSnapshotTable.seq))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return {
      runId,
      sequence: row.seq,
      state: row.state,
      occurredAt: typeof row.occurredAt === "string" ? row.occurredAt : row.occurredAt.toISOString(),
    };
  }

  async getSnapshotAfterSequence(runId: string, sequence: number): Promise<RunEventSnapshot | null> {
    const rows = await this.db
      .select()
      .from(PgRunSnapshotTable)
      .where(
        and(
          eq(PgRunSnapshotTable.aggregateId, runId as RunId),
          lte(PgRunSnapshotTable.seq, sequence),
        ),
      )
      .orderBy(desc(PgRunSnapshotTable.seq))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return {
      runId,
      sequence: row.seq,
      state: row.state,
      occurredAt: typeof row.occurredAt === "string" ? row.occurredAt : row.occurredAt.toISOString(),
    };
  }

  async appendTransactional(event: RunEvent, sessionUpdate?: { sessionId: string; updates: SessionUpdates }): Promise<void> {
    if (event.persist === false) {
      this.notify(event);
      return;
    }
    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO event_sequence (aggregate_id, seq) VALUES (${event.runId}, ${event.sequence})
            ON CONFLICT (aggregate_id) DO UPDATE SET seq = ${event.sequence}`,
      );
      // Idempotent: ON CONFLICT DO NOTHING
      await tx.execute(
        sql`INSERT INTO run_events (id, aggregate_id, seq, type, occurred_at, trace_id, data)
            VALUES (${event.id}, ${event.runId}, ${event.sequence}, ${event.type}, ${new Date(event.occurredAt)}, ${event.traceId}, ${event.data as Record<string, unknown>})
            ON CONFLICT (id) DO NOTHING`,
      );
      if (sessionUpdate) {
        const { sessionId, updates } = sessionUpdate;
        const setClauses: string[] = [];
        if (updates.title !== undefined) setClauses.push(`title = '${updates.title.replace(/'/g, "''")}'`);
        if (updates.isActive !== undefined) setClauses.push(`is_active = ${updates.isActive}`);
        if (updates.model !== undefined) setClauses.push(`model = '${updates.model.replace(/'/g, "''")}'`);
        if (updates.cost !== undefined) setClauses.push(`cost = ${updates.cost}`);
        if (updates.inputTokens !== undefined) setClauses.push(`input_tokens = ${updates.inputTokens}`);
        if (updates.outputTokens !== undefined) setClauses.push(`output_tokens = ${updates.outputTokens}`);
        if (updates.agentId !== undefined) setClauses.push(`agent_id = '${updates.agentId}'`);
        if (setClauses.length > 0) {
          await tx.execute(sql.raw(`UPDATE sessions SET ${setClauses.join(", ")} WHERE id = '${sessionId}'`));
        }
      }
    });
    this.notify(event);
  }
}
