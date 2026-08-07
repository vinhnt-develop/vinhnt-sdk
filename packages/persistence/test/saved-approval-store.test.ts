import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { createDb, pushSchema } from "../src/drizzle/migration.js";
import { DrizzleSavedApprovalStore } from "../src/drizzle/saved-approval-store.js";

const TEST_DIR = mkdtempSync(join(tmpdir(), "vnt-approval-"));
const TEST_DB_PATH = join(TEST_DIR, "test.db");

describe("DrizzleSavedApprovalStore", () => {
  let store: DrizzleSavedApprovalStore;
  let rawDb: ReturnType<typeof createDb>;

  beforeAll(() => {
    rawDb = createDb(TEST_DB_PATH);
    pushSchema(rawDb);
    store = new DrizzleSavedApprovalStore(rawDb);
  });

  afterAll(() => {
    try {
      if (existsSync(TEST_DB_PATH)) rmSync(TEST_DIR, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  beforeEach(() => {
    rawDb.run(sql`DELETE FROM saved_approvals`);
  });

  it("starts empty", async () => {
    const all = await store.loadAll();
    expect(all).toEqual([]);
  });

  it("saveApproval + loadAll round-trips", async () => {
    await store.saveApproval({ resource: "/tmp/foo", action: "read_file" });
    await store.saveApproval({ resource: "/tmp/bar", action: "write_file", agentId: "agent-1" });
    const all = await store.loadAll();
    expect(all).toHaveLength(2);
    expect(all[0]).toEqual({ resource: "/tmp/foo", action: "read_file" });
    expect(all[1]).toEqual({ resource: "/tmp/bar", action: "write_file", agentId: "agent-1" });
  });

  it("upserts on duplicate resource:action", async () => {
    await store.saveApproval({ resource: "/tmp/foo", action: "read_file" });
    await store.saveApproval({ resource: "/tmp/foo", action: "read_file" });
    const all = await store.loadAll();
    expect(all).toHaveLength(1);
  });

  it("removeApproval deletes the row", async () => {
    await store.saveApproval({ resource: "/tmp/foo", action: "read_file" });
    await store.removeApproval("/tmp/foo", "read_file");
    const all = await store.loadAll();
    expect(all).toEqual([]);
  });

  it("different actions on same resource are separate entries", async () => {
    await store.saveApproval({ resource: "/tmp/foo", action: "read_file" });
    await store.saveApproval({ resource: "/tmp/foo", action: "write_file" });
    const all = await store.loadAll();
    expect(all).toHaveLength(2);
  });
});
