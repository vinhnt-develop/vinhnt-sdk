import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DrizzleAgentStore } from "../src/drizzle/agent-store.js";
import type { AgentId, AgentConfig } from "@vinhnt-sdk/core";

const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "vnt-drizzle-agent-test-"));
const TEST_DB_PATH = join(TEST_DB_DIR, "agent-test.db");

const testAgent: AgentConfig = {
  id: "agent-code-1" as AgentId,
  profile: { name: "Code Assistant", description: "Helps with code" },
  capabilities: { tools: ["read", "write"], streaming: true },
  systemPrompt: "You are a code assistant.",
};

const testAgent2: AgentConfig = {
  id: "agent-debug-1" as AgentId,
  profile: { name: "Debugger", description: "Helps debug code" },
  capabilities: { tools: ["read", "shell"], models: ["gpt-4"] },
  systemPrompt: "You are a debugger.",
};

describe("DrizzleAgentStore", () => {
  let store: DrizzleAgentStore;

  beforeAll(() => {
    store = new DrizzleAgentStore(TEST_DB_PATH);
  });

  afterAll(() => {
    try {
      if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
      if (existsSync(TEST_DB_PATH + "-wal")) unlinkSync(TEST_DB_PATH + "-wal");
      if (existsSync(TEST_DB_PATH + "-shm")) unlinkSync(TEST_DB_PATH + "-shm");
    } catch { /* ignore */ }
  });

  it("register and get an agent", async () => {
    await store.register(testAgent);
    const result = await store.get(testAgent.id);
    expect(result).toEqual(testAgent);
  });

  it("get returns null for unknown agent", async () => {
    const result = await store.get("unknown" as AgentId);
    expect(result).toBeNull();
  });

  it("list returns all registered agents", async () => {
    await store.register(testAgent2);
    const list = await store.list();
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it("findByCapability filters agents by capability key-value", async () => {
    const streaming = await store.findByCapability("streaming", true);
    expect(streaming.length).toBeGreaterThanOrEqual(1);
    expect(streaming.some((a) => a.id === testAgent.id)).toBe(true);
  });

  it("findByCapability returns empty when no match", async () => {
    const result = await store.findByCapability("nonexistent", true);
    expect(result).toEqual([]);
  });

  it("unregister removes an agent", async () => {
    const unreg: AgentConfig = {
      id: "agent-unreg" as AgentId,
      profile: { name: "Unreg", description: "To be removed" },
      capabilities: {},
    };
    await store.register(unreg);
    await store.unregister(unreg.id);
    const result = await store.get(unreg.id);
    expect(result).toBeNull();
  });

  it("update merges patch into existing agent", async () => {
    const upd: AgentConfig = {
      id: "agent-upd" as AgentId,
      profile: { name: "Before", description: "desc" },
      capabilities: {},
    };
    await store.register(upd);
    const updated = await store.update(upd.id, { systemPrompt: "patched", temperature: 0.2 });
    expect(updated?.systemPrompt).toBe("patched");
    expect(updated?.temperature).toBe(0.2);
    const fetched = await store.get(upd.id);
    expect(fetched?.systemPrompt).toBe("patched");
    expect(fetched?.temperature).toBe(0.2);
  });

  it("update returns null for unknown agent", async () => {
    const result = await store.update("missing" as AgentId, {});
    expect(result).toBeNull();
  });

  it("register with parentId creates parent-child relationship", async () => {
    const parent: AgentConfig = {
      id: "parent" as AgentId, profile: { name: "Parent", description: "" }, capabilities: {},
    };
    const child: AgentConfig = {
      id: "child" as AgentId, profile: { name: "Child", description: "" }, capabilities: {},
    };
    await store.register(parent);
    await store.register(child, parent.id);
    const children = await store.getChildren(parent.id);
    expect(children).toHaveLength(1);
    expect(children[0]?.id).toBe(child.id);
    const gotParent = await store.getParent(child.id);
    expect(gotParent?.id).toBe(parent.id);
  });

  it("getAncestors returns chain from child to root", async () => {
    const root: AgentConfig = { id: "root" as AgentId, profile: { name: "Root", description: "" }, capabilities: {} };
    const mid: AgentConfig = { id: "mid" as AgentId, profile: { name: "Mid", description: "" }, capabilities: {} };
    const leaf: AgentConfig = { id: "leaf" as AgentId, profile: { name: "Leaf", description: "" }, capabilities: {} };
    await store.register(root);
    await store.register(mid, root.id);
    await store.register(leaf, mid.id);
    const ancestors = await store.getAncestors(leaf.id);
    expect(ancestors).toHaveLength(2);
    expect(ancestors[0]?.id).toBe("root");
    expect(ancestors[1]?.id).toBe("mid");
  });
});
