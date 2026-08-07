import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { DrizzlePgRunEventStore } from "../src/drizzle/pg-run-event-store.js";
import { DrizzlePgSessionStore } from "../src/drizzle/pg-session-store.js";
import { DrizzlePgAgentStore } from "../src/drizzle/pg-agent-store.js";
import { DrizzlePgPermissionStore } from "../src/drizzle/pg-permission-store.js";
import type { RunEvent, AgentId, AgentConfig } from "@vinhnt-sdk/agent-core";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const runTests = DATABASE_URL.length > 0 ? describe : describe.skip;

runTests("DrizzlePgRunEventStore", () => {
  let store: DrizzlePgRunEventStore;

  beforeAll(async () => {
    store = new DrizzlePgRunEventStore(DATABASE_URL);
    await store.init();
  });

  afterAll(async () => {
    await store.close();
  });

  const makeEvent = (overrides: Partial<RunEvent> & { data?: unknown } = {}): RunEvent => ({
    id: overrides.id ?? crypto.randomUUID(),
    runId: overrides.runId ?? "drizzle-pg-test-run",
    sequence: overrides.sequence ?? 0,
    type: overrides.type ?? "test.event",
    occurredAt: overrides.occurredAt ?? new Date().toISOString(),
    traceId: overrides.traceId ?? "drizzle-pg-trace",
    data: overrides.data ?? { message: "hello from drizzle pg" },
  });

  it("append and list event", async () => {
    const ev = makeEvent({ runId: "dpg-append", type: "run.started", data: { step: 0 } });
    await store.append(ev);
    const events = await store.list("dpg-append");
    expect(events).toHaveLength(1);
    expect(events[0]!.id).toBe(ev.id);
    expect(events[0]!.data).toEqual({ step: 0 });
  });

  it("list returns empty for nonexistent run", async () => {
    const events = await store.list("dpg-nonexistent");
    expect(events).toEqual([]);
  });

  it("list afterSequence filters correctly", async () => {
    const runId = "dpg-after";
    for (let i = 0; i < 4; i++) {
      await store.append(makeEvent({ runId, sequence: i }));
    }
    const events = await store.list(runId, 1);
    expect(events).toHaveLength(2);
    expect(events[0]!.sequence).toBe(2);
  });

  it("stores nested JSON data", async () => {
    const runId = "dpg-nested";
    const data = { user: { name: "Alice", tags: ["x", "y"] }, deep: { a: { b: 2 } } };
    await store.append(makeEvent({ runId, sequence: 0, data }));
    const events = await store.list(runId);
    expect(events[0]!.data).toEqual(data);
  });

  it("saveSnapshot and getSnapshot", async () => {
    const runId = "dpg-snapshot";
    await store.append(makeEvent({ runId, sequence: 0, data: { n: 0 } }));
    await store.append(makeEvent({ runId, sequence: 1, data: { n: 1 } }));
    await store.saveSnapshot(runId, { step: 2, status: "running" });

    const snap = await store.getSnapshot(runId);
    expect(snap).not.toBeNull();
    expect(snap!.sequence).toBe(1);
    expect(snap!.state).toEqual({ step: 2, status: "running" });
  });

  it("getSnapshotAfterSequence returns correct snapshot", async () => {
    const runId = "dpg-snap-after";
    await store.append(makeEvent({ runId, sequence: 0, data: {} }));
    await store.saveSnapshot(runId, { step: 1 });
    await store.append(makeEvent({ runId, sequence: 1, data: {} }));
    await store.saveSnapshot(runId, { step: 2 });

    const snap = await store.getSnapshotAfterSequence(runId, 1);
    expect(snap).not.toBeNull();
    expect(snap!.sequence).toBe(1);
  });
});

runTests("DrizzlePgSessionStore", () => {
  let store: DrizzlePgSessionStore;

  beforeAll(async () => {
    store = new DrizzlePgSessionStore(DATABASE_URL);
    await store.init();
  });

  afterAll(async () => {
    await store.close();
  });

  it("creates and retrieves session", async () => {
    const session = await store.createSession("PG Drizzle Test");
    expect(session.title).toBe("PG Drizzle Test");
    expect(session.isActive).toBe(true);

    const retrieved = await store.getSession(session.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.title).toBe("PG Drizzle Test");
  });

  it("adds and lists messages", async () => {
    const session = await store.createSession("PG Msg Session");
    await store.addMessage(session.id, "user", "Hello PG");
    const msg2 = await store.addMessage(session.id, "assistant", "Hi from PG");
    const msgs = await store.listMessages(session.id);
    expect(msgs).toHaveLength(2);
    expect(msgs[1]!.content).toBe("Hi from PG");
  });
});

runTests("DrizzlePgAgentStore", () => {
  let store: DrizzlePgAgentStore;

  beforeAll(async () => {
    store = new DrizzlePgAgentStore(DATABASE_URL);
    await store.init();
  });

  const testAgent: AgentConfig = {
    id: crypto.randomUUID() as AgentId,
    profile: { name: "PG Agent", description: "Postgres agent store test" },
    capabilities: { tools: ["read"], streaming: false },
    systemPrompt: "You are a test agent.",
  };

  it("registers and retrieves agent", async () => {
    await store.register(testAgent);
    const retrieved = await store.get(testAgent.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.profile.name).toBe("PG Agent");
  });

  it("lists agents", async () => {
    const agents = await store.list();
    expect(agents.length).toBeGreaterThanOrEqual(1);
    expect(agents.some((a) => a.id === testAgent.id)).toBe(true);
  });

  it("registers agent with permissions", async () => {
    const agentWithPerms: AgentConfig = {
      id: crypto.randomUUID() as AgentId,
      profile: { name: "Perm Agent", description: "Has permissions" },
      capabilities: {},
      permissions: { mode: "restricted", allowedTools: ["read", "write"] },
    };
    await store.register(agentWithPerms);
    const retrieved = await store.get(agentWithPerms.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.permissions?.mode).toBe("restricted");
  });

  it("unregisters agent", async () => {
    const agent: AgentConfig = {
      id: crypto.randomUUID() as AgentId,
      profile: { name: "Unreg Agent", description: "" },
      capabilities: {},
    };
    await store.register(agent);
    await store.unregister(agent.id);
    const retrieved = await store.get(agent.id);
    expect(retrieved).toBeNull();
  });

  it("finds agents by capability", async () => {
    const streamingAgent: AgentConfig = {
      id: crypto.randomUUID() as AgentId,
      profile: { name: "Streamer", description: "" },
      capabilities: { streaming: true },
    };
    await store.register(streamingAgent);
    const results = await store.findByCapability("streaming", true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((a) => a.id === streamingAgent.id)).toBe(true);
  });

  it("handles parent-child relationships", async () => {
    const parent: AgentConfig = {
      id: crypto.randomUUID() as AgentId,
      profile: { name: "Parent", description: "" }, capabilities: {},
    };
    const child: AgentConfig = {
      id: crypto.randomUUID() as AgentId,
      profile: { name: "Child", description: "" }, capabilities: {},
    };
    await store.register(parent);
    await store.register(child, parent.id);
    const children = await store.getChildren(parent.id);
    expect(children).toHaveLength(1);
    expect(children[0]!.id).toBe(child.id);
    const parentResult = await store.getParent(child.id);
    expect(parentResult?.id).toBe(parent.id);
  });
});

runTests("DrizzlePgPermissionStore", () => {
  let store: DrizzlePgPermissionStore;

  beforeAll(async () => {
    store = new DrizzlePgPermissionStore(DATABASE_URL);
    await store.init();
  });

  it("adds a saved rule", async () => {
    await store.addSavedRule("pg-perm-run", "bash", "git *");
    const rules = await store.listSavedRules("pg-perm-run");
    expect(rules.length).toBeGreaterThanOrEqual(1);
    expect(rules[0]!.action).toBe("bash");
    expect(rules[0]!.resource).toBe("git *");
    expect(rules[0]!.effect).toBe("allow");
  });

  it("addSavedRule is idempotent (duplicate ignored)", async () => {
    await store.addSavedRule("pg-perm-run", "bash", "git *");
    const rules = await store.listSavedRules("pg-perm-run");
    const bashRules = rules.filter((r) => r.action === "bash" && r.resource === "git *");
    expect(bashRules).toHaveLength(1);
  });

  it("removes a saved rule", async () => {
    await store.addSavedRule("pg-perm-remove", "read_file", "/src/main.ts");
    await store.removeSavedRule("pg-perm-remove", "read_file", "/src/main.ts");
    const rules = await store.listSavedRules("pg-perm-remove");
    const removed = rules.filter((r) => r.action === "read_file");
    expect(removed).toHaveLength(0);
  });
});
