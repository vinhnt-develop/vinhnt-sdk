import { describe, expect, it, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { DrizzleSessionStore } from "../src/index.js";

const dbs: string[] = [];
function tempDb(): string {
  const p = join(tmpdir(), `store-drizzle-session-${crypto.randomUUID()}.db`);
  dbs.push(p);
  return p;
}

afterEach(() => {
  for (const p of dbs.splice(0)) {
    try {
      rmSync(`${p}-wal`, { force: true });
      rmSync(`${p}-shm`, { force: true });
      rmSync(p, { force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});

describe("DrizzleSessionStore", () => {
  it("creates and fetches a session", async () => {
    const store = new DrizzleSessionStore(tempDb());
    const session = await store.createSession("My Session");

    const fetched = await store.getSession(session.id);
    expect(fetched?.title).toBe("My Session");
    expect(fetched?.isActive).toBe(true);
  });

  it("lists sessions sorted by updatedAt desc with pagination", async () => {
    const store = new DrizzleSessionStore(tempDb());
    const a = await store.createSession("A");
    const b = await store.createSession("B");
    await new Promise((r) => setTimeout(r, 2));
    await store.updateSession(a.id, { title: "A2" });

    const sessions = await store.listSessions();
    expect(sessions.map((s) => s.id)).toEqual([a.id, b.id]);

    const paged = await store.listSessions(1, 0);
    expect(paged.map((s) => s.id)).toEqual([a.id]);
  });

  it("forks a session and copies messages with new ids", async () => {
    const store = new DrizzleSessionStore(tempDb());
    const source = await store.createSession("Source");
    const msg = await store.addMessage(source.id, "user", "hello");

    const fork = await store.forkSession(source.id);
    expect(fork.title).toBe("Fork of Source");

    const messages = await store.listMessages(fork.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe("hello");
    expect(messages[0]?.id).not.toBe(msg.id);
  });

  it("throws when forking a missing session", async () => {
    const store = new DrizzleSessionStore(tempDb());
    await expect(store.forkSession("missing")).rejects.toThrow("not found");
  });

  it("updates and deletes sessions", async () => {
    const store = new DrizzleSessionStore(tempDb());
    const session = await store.createSession("X");
    await store.updateSession(session.id, { isActive: false, cost: 12.5, inputTokens: 7 });
    const updated = await store.getSession(session.id);
    expect(updated?.isActive).toBe(false);
    expect(updated?.cost).toBe(12.5);
    expect(updated?.inputTokens).toBe(7);

    await store.deleteSession(session.id);
    expect(await store.getSession(session.id)).toBeNull();
  });

  it("adds and lists messages", async () => {
    const store = new DrizzleSessionStore(tempDb());
    const session = await store.createSession();
    await store.addMessage(session.id, "user", "hi", undefined, { input: 10, output: 5 }, "gpt-4o", 1.5);

    const messages = await store.listMessages(session.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.tokens).toEqual({ input: 10, output: 5 });
    expect(messages[0]?.model).toBe("gpt-4o");
    expect(messages[0]?.cost).toBe(1.5);
  });

  it("searches messages by keyword", async () => {
    const store = new DrizzleSessionStore(tempDb());
    const session = await store.createSession();
    await store.addMessage(session.id, "user", "Fix the database connection");
    await store.addMessage(session.id, "assistant", "Done fixing");

    const matches = await store.searchMessages("database");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.content).toContain("database");

    expect(await store.searchMessages("nomatch")).toHaveLength(0);
  });

  it("computes session stats", async () => {
    const store = new DrizzleSessionStore(tempDb());
    const session = await store.createSession("A");
    await store.addMessage(session.id, "user", "x", undefined, { input: 100, output: 50 }, "gpt-4o", 2);
    await store.updateSession(session.id, { model: "gpt-4o", cost: 2, inputTokens: 100, outputTokens: 50 });

    const stats = await store.getSessionStats();
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalMessages).toBe(1);
    expect(stats.totalCost).toBe(2);
    expect(stats.totalInputTokens).toBe(100);
    expect(stats.totalOutputTokens).toBe(50);
    expect(stats.costByModel).toEqual([{ model: "gpt-4o", cost: 2 }]);
  });
});