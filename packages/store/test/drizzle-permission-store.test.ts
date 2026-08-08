import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DrizzlePermissionStore } from "../src/drizzle/permission-store.js";

const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "vnt-drizzle-permission-test-"));
const TEST_DB_PATH = join(TEST_DB_DIR, "permission-test.db");

describe("DrizzlePermissionStore", () => {
  let store: DrizzlePermissionStore;

  beforeAll(() => {
    store = new DrizzlePermissionStore(TEST_DB_PATH);
  });

  afterAll(() => {
    try {
      if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
      if (existsSync(TEST_DB_PATH + "-wal")) unlinkSync(TEST_DB_PATH + "-wal");
      if (existsSync(TEST_DB_PATH + "-shm")) unlinkSync(TEST_DB_PATH + "-shm");
    } catch { /* ignore */ }
  });

  it("adds a saved rule", async () => {
    await store.addSavedRule("run-1", "read_file", "/src/main.ts");
    const rules = await store.listSavedRules("run-1");
    expect(rules).toHaveLength(1);
    expect(rules[0]!.action).toBe("read_file");
    expect(rules[0]!.resource).toBe("/src/main.ts");
    expect(rules[0]!.effect).toBe("allow");
  });

  it("addSavedRule is idempotent (duplicate ignored)", async () => {
    await store.addSavedRule("run-1", "read_file", "/src/main.ts");
    const rules = await store.listSavedRules("run-1");
    expect(rules).toHaveLength(1);
  });

  it("lists rules scoped to runId", async () => {
    await store.addSavedRule("run-2", "write_file", "/src/lib.ts");
    const rulesRun1 = await store.listSavedRules("run-1");
    const rulesRun2 = await store.listSavedRules("run-2");
    expect(rulesRun1).toHaveLength(1);
    expect(rulesRun2).toHaveLength(1);
    expect(rulesRun1[0]!.resource).toBe("/src/main.ts");
    expect(rulesRun2[0]!.resource).toBe("/src/lib.ts");
  });

  it("listSavedRules returns empty for unknown runId", async () => {
    const rules = await store.listSavedRules("nonexistent");
    expect(rules).toEqual([]);
  });

  it("removes a saved rule", async () => {
    await store.addSavedRule("run-3", "bash", "npm test");
    await store.removeSavedRule("run-3", "bash", "npm test");
    const rules = await store.listSavedRules("run-3");
    expect(rules).toEqual([]);
  });

  it("removeSavedRule is idempotent", async () => {
    await store.removeSavedRule("nonexistent", "noop", "noop");
  });

  it("handles multiple rules for same run", async () => {
    await store.addSavedRule("run-4", "a", "r1");
    await store.addSavedRule("run-4", "b", "r2");
    await store.addSavedRule("run-4", "c", "r3");
    const rules = await store.listSavedRules("run-4");
    expect(rules).toHaveLength(3);
  });

  it("only removes specified rule, not all for run", async () => {
    await store.addSavedRule("run-5", "keep", "/keep");
    await store.addSavedRule("run-5", "remove", "/remove");
    await store.removeSavedRule("run-5", "remove", "/remove");
    const rules = await store.listSavedRules("run-5");
    expect(rules).toHaveLength(1);
    expect(rules[0]!.action).toBe("keep");
  });
});
