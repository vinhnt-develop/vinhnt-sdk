import { describe, expect, it, beforeAll, afterAll } from "vitest";
import type { RunEvent, RunId } from "@vinhnt-sdk/schema";
import {
  createPgDb,
  getPgPool,
  pushPgSchema,
  DrizzlePgRunEventStore,
  DrizzlePgSessionStore,
} from "../src/index.js";
import type pg from "pg";
import type { PgDb } from "../src/index.js";

const url = process.env.TEST_PG_URL;

describe.skipIf(!url)("store-drizzle-pg (integration)", () => {
  let pool: pg.Pool;
  let db: PgDb;

  beforeAll(async () => {
    pool = getPgPool(url as string);
    db = createPgDb(url as string);
  });

  afterAll(async () => {
    await pool.end();
  });

  const runId = "pg-run-1" as RunId;

  function makeEvent(partial: Partial<RunEvent> = {}): RunEvent {
    return {
      id: `evt-${crypto.randomUUID()}`,
      runId,
      sequence: partial.sequence ?? 1,
      type: "test.event",
      occurredAt: new Date().toISOString(),
      traceId: "trace-1",
      data: { hello: "world" },
      ...partial,
    };
  }

  it("appends, lists and dedupes events", async () => {
    await pushPgSchema(pool);
    const store = new DrizzlePgRunEventStore(db);

    await store.append(makeEvent({ sequence: 1 }));
    await store.append(makeEvent({ sequence: 2 }));
    const dup = makeEvent({ sequence: 3 });
    await store.append(dup);
    await store.append(dup);

    const events = await store.list(runId);
    expect(events).toHaveLength(3);

    expect(await store.getSnapshot(runId)).toBeNull();

    await store.saveSnapshot(runId, { step: 1 });
    const snap = await store.getSnapshot(runId);
    expect(snap?.state).toEqual({ step: 1 });
  });

  it("creates sessions and messages", async () => {
    await pushPgSchema(pool);
    const sessions = new DrizzlePgSessionStore(db);

    const session = await sessions.createSession("PG Session");
    await sessions.addMessage(session.id, "user", "hello postgres", undefined, { input: 5, output: 3 }, "gpt-4o", 0.5);

    const messages = await sessions.listMessages(session.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe("hello postgres");

    const found = await sessions.searchMessages("postgres");
    expect(found).toHaveLength(1);

    const stats = await sessions.getSessionStats();
    expect(stats.totalSessions).toBeGreaterThan(0);
  });
});