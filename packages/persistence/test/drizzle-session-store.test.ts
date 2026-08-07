import type { WorkspaceId } from "@vinhnt-sdk/agent-core";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DrizzleSessionStore } from "../src/drizzle/session-store.js";
import type { AgentId } from "@vinhnt-sdk/agent-core";

const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "vnt-drizzle-session-test-"));
const TEST_DB_PATH = join(TEST_DB_DIR, "session-test.db");

describe("DrizzleSessionStore", () => {
  let store: DrizzleSessionStore;

  beforeAll(() => {
    store = new DrizzleSessionStore(TEST_DB_PATH);
  });

  afterAll(() => {
    try {
      if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
      if (existsSync(TEST_DB_PATH + "-wal")) unlinkSync(TEST_DB_PATH + "-wal");
      if (existsSync(TEST_DB_PATH + "-shm")) unlinkSync(TEST_DB_PATH + "-shm");
    } catch { /* ignore */ }
  });

  it("createSession creates a new session", async () => {
    const session = await store.createSession("Test Session");
    expect(session.title).toBe("Test Session");
    expect(session.isActive).toBe(true);
  });

  it("createSession with default title", async () => {
    const session = await store.createSession();
    expect(session.title).toBe("New Session");
  });

  it("createSession with parentSessionId", async () => {
    const parent = await store.createSession("Parent");
    const child = await store.createSession("Child", parent.id);
    expect(child.parentSessionId).toBe(parent.id);
  });

  it("getSession returns null for unknown id", async () => {
    const result = await store.getSession("nonexistent");
    expect(result).toBeNull();
  });

  it("getSession returns the correct session", async () => {
    const created = await store.createSession("Get Test");
    const result = await store.getSession(created.id);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Get Test");
    expect(result!.id).toBe(created.id);
  });

  it("updateSession updates title", async () => {
    const session = await store.createSession("Old Title");
    await store.updateSession(session.id, { title: "New Title" });
    const updated = await store.getSession(session.id);
    expect(updated!.title).toBe("New Title");
  });

  it("updateSession updates model, tokens, and cost", async () => {
    const session = await store.createSession("Token Test");
    await store.updateSession(session.id, {
      model: "gpt-4",
      inputTokens: 100,
      outputTokens: 50,
      cost: 0.002,
    });
    const updated = await store.getSession(session.id);
    expect(updated!.model).toBe("gpt-4");
    expect(updated!.inputTokens).toBe(100);
    expect(updated!.outputTokens).toBe(50);
    expect(updated!.cost).toBe(0.002);
  });

  it("updateSession updates agentId and location", async () => {
    const session = await store.createSession("Agent Test");
    await store.updateSession(session.id, {
      agentId: "agent-123" as AgentId,
      location: { directory: "/home/project", workspaceId: "ws-1" as WorkspaceId },
    });
    const updated = await store.getSession(session.id);
    expect(updated!.agentId).toBe("agent-123");
    expect(updated!.location).toEqual({ directory: "/home/project", workspaceId: "ws-1" as WorkspaceId });
  });

  it("updateSession with location directory only", async () => {
    const session = await store.createSession("Location Test");
    await store.updateSession(session.id, {
      location: { directory: "/home/test" },
    });
    const updated = await store.getSession(session.id);
    expect(updated!.location).toEqual({ directory: "/home/test" });
  });

  it("updateSession sets isActive to false", async () => {
    const session = await store.createSession("Active Test");
    await store.updateSession(session.id, { isActive: false });
    const updated = await store.getSession(session.id);
    expect(updated!.isActive).toBe(false);
  });

  it("listSessions returns sessions ordered by updatedAt", async () => {
    const a = await store.createSession("List A");
    const b = await store.createSession("List B");
    await store.updateSession(a.id, { title: "List A Updated" });
    const sessions = await store.listSessions(10, 0);
    const foundA = sessions.find((s) => s.id === a.id);
    const foundB = sessions.find((s) => s.id === b.id);
    expect(foundA).toBeDefined();
    expect(foundB).toBeDefined();
  });

  it("listSessions respects limit and offset", async () => {
    await store.createSession("Limit A");
    await store.createSession("Limit B");
    await store.createSession("Limit C");
    const page1 = await store.listSessions(2, 0);
    expect(page1.length).toBeLessThanOrEqual(2);
    const page2 = await store.listSessions(2, 2);
    expect(page2.length).toBeGreaterThanOrEqual(1);
  });

  it("addMessage creates a message and updates session timestamp", async () => {
    const session = await store.createSession("Msg Test");
    const msg = await store.addMessage(session.id, "user", "Hello");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello");
    expect(msg.sessionId).toBe(session.id);
    const after = await store.getSession(session.id);
    expect(after!.updatedAt).toBeTruthy();
  });

  it("addMessage with toolCallId", async () => {
    const session = await store.createSession("Tool Msg");
    const msg = await store.addMessage(session.id, "tool", "result data", "call-123");
    expect(msg.toolCallId).toBe("call-123");
  });

  it("addMessage with tokens, model, cost", async () => {
    const session = await store.createSession("Token Msg");
    const tokens = { input: 150, output: 75, reasoning: 10 };
    const msg = await store.addMessage(session.id, "assistant", "response", undefined, tokens, "gpt-4o", 0.003);
    expect(msg.tokens).toEqual(tokens);
    expect(msg.model).toBe("gpt-4o");
    expect(msg.cost).toBe(0.003);

    const msgs = await store.listMessages(session.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.tokens).toEqual(tokens);
    expect(msgs[0]!.model).toBe("gpt-4o");
    expect(msgs[0]!.cost).toBe(0.003);
  });

  it("listMessages returns messages in order", async () => {
    const session = await store.createSession("List Msgs");
    await store.addMessage(session.id, "user", "First");
    await store.addMessage(session.id, "assistant", "Second");
    const msgs = await store.listMessages(session.id);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.role).toBe("user");
    expect(msgs[1]!.role).toBe("assistant");
  });

  it("deleteSession removes the session", async () => {
    const session = await store.createSession("Delete Me");
    await store.deleteSession(session.id);
    const result = await store.getSession(session.id);
    expect(result).toBeNull();
  });

  it("forkSession creates a new session with parentSessionId and copies messages", async () => {
    const parent = await store.createSession("Parent Session");
    await store.addMessage(parent.id, "user", "Hello");
    await store.addMessage(parent.id, "assistant", "World");
    await store.addMessage(parent.id, "user", "Tool result", "call-1");

    const fork = await store.forkSession(parent.id);
    expect(fork.parentSessionId).toBe(parent.id);
    expect(fork.title).toBe("Fork of Parent Session");
    expect(fork.isActive).toBe(true);

    const msgs = await store.listMessages(fork.id);
    expect(msgs).toHaveLength(3);
    expect(msgs[0]!.role).toBe("user");
    expect(msgs[0]!.content).toBe("Hello");
    expect(msgs[1]!.role).toBe("assistant");
    expect(msgs[1]!.content).toBe("World");
    expect(msgs[2]!.role).toBe("user");
    expect(msgs[2]!.content).toBe("Tool result");
    expect(msgs[2]!.toolCallId).toBe("call-1");
  });

  it("forkSession throws for nonexistent source session", async () => {
    await expect(store.forkSession("nonexistent")).rejects.toThrow("Source session not found");
  });

  it("forkSession with custom title", async () => {
    const parent = await store.createSession("Source");
    const fork = await store.forkSession(parent.id, "My Fork");
    expect(fork.title).toBe("My Fork");
  });

  it("forkSession creates a session with no messages", async () => {
    const parent = await store.createSession("Empty Parent");
    const fork = await store.forkSession(parent.id);
    const msgs = await store.listMessages(fork.id);
    expect(msgs).toHaveLength(0);
  });

  it("forkSession copies tokens, model, cost", async () => {
    const parent = await store.createSession("Rich Parent");
    await store.addMessage(parent.id, "user", "hello");
    await store.addMessage(parent.id, "assistant", "world", undefined, { input: 50, output: 30 }, "claude-4", 0.005);

    const fork = await store.forkSession(parent.id);
    const msgs = await store.listMessages(fork.id);
    expect(msgs).toHaveLength(2);
    const assistant = msgs.find((m) => m.role === "assistant")!;
    expect(assistant.tokens).toEqual({ input: 50, output: 30 });
    expect(assistant.model).toBe("claude-4");
    expect(assistant.cost).toBe(0.005);
  });

  it("searchMessages finds messages by content", async () => {
    const session = await store.createSession("Search Test");
    await store.addMessage(session.id, "user", "Refactor the database schema");
    await store.addMessage(session.id, "assistant", "Goodbye baz qux");
    const results = await store.searchMessages("database");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((m) => m.content.includes("database"))).toBe(true);
    const hit = results.find((m) => m.content.includes("Refactor"));
    expect(hit?.sessionId).toBe(session.id);
    expect(hit?.createdAt).toBeTruthy();
  });
});
