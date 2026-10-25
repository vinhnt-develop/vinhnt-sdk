/**
 * TC28 — Checkpointer (MemoryCheckpointer) unit tests.
 *
 * Covers: put, getTuple, putWrites, list, delete, createSnapshot,
 * serializeSnapshot, deserializeSnapshot.
 */

import { describe, it, expect } from "vitest";
import {
  MemoryCheckpointer,
  createMemoryCheckpointer,
  createSnapshot,
  serializeSnapshot,
  deserializeSnapshot,
} from "../src/state/checkpoint.js";
import type { GraphConfig, StateSnapshot } from "../src/state/checkpoint.js";

const baseConfig: GraphConfig = {
  threadId: "thread_1",
  checkpointNs: "",
};

describe("TC28_memory_checkpointer", () => {
  it("TC28_01_put_and_getTuple_latest", async () => {
    const cp = new MemoryCheckpointer();
    const s1 = createSnapshot(baseConfig, { a: 1 }, { next: ["node1"] });
    const s2 = createSnapshot(baseConfig, { a: 2 }, { next: ["node2"] });
    await cp.put(baseConfig, s1);
    await cp.put(baseConfig, s2);

    const tuple = await cp.getTuple(baseConfig);
    expect(tuple).not.toBeNull();
    expect(tuple!.values).toEqual({ a: 2 });
    expect(tuple!.next).toEqual(["node2"]);
  });

  it("TC28_02_getTuple_missing_returns_null", async () => {
    const cp = new MemoryCheckpointer();
    const tuple = await cp.getTuple({ threadId: "missing", checkpointNs: "" });
    expect(tuple).toBeNull();
  });

  it("TC28_03_list_sorted_newest_first", async () => {
    const cp = new MemoryCheckpointer();
    const s1 = createSnapshot(baseConfig, { i: 1 }, {
      createdAt: "2026-01-01T00:00:00Z",
    });
    const s2 = createSnapshot(baseConfig, { i: 2 }, {
      createdAt: "2026-01-02T00:00:00Z",
    });
    const s3 = createSnapshot(baseConfig, { i: 3 }, {
      createdAt: "2026-01-03T00:00:00Z",
    });
    await cp.put(baseConfig, s1);
    await cp.put(baseConfig, s2);
    await cp.put(baseConfig, s3);

    const list = await cp.list("thread_1");
    expect(list).toHaveLength(3);
    expect(list[0]!.values).toEqual({ i: 3 });
    expect(list[1]!.values).toEqual({ i: 2 });
    expect(list[2]!.values).toEqual({ i: 1 });
  });

  it("TC28_04_list_filters_by_thread", async () => {
    const cp = new MemoryCheckpointer();
    await cp.put(baseConfig, createSnapshot(baseConfig, { t: 1 }));
    await cp.put(
      { threadId: "thread_2", checkpointNs: "" },
      createSnapshot({ threadId: "thread_2", checkpointNs: "" }, { t: 2 }),
    );

    const list = await cp.list("thread_1");
    expect(list).toHaveLength(1);
    expect(list[0]!.values).toEqual({ t: 1 });
  });

  it("TC28_05_delete_removes_snapshots", async () => {
    const cp = new MemoryCheckpointer();
    await cp.put(baseConfig, createSnapshot(baseConfig, { a: 1 }));
    await cp.delete(baseConfig);
    const tuple = await cp.getTuple(baseConfig);
    expect(tuple).toBeNull();
  });

  it("TC28_06_createMemoryCheckpointer_factory", () => {
    const cp = createMemoryCheckpointer();
    expect(cp).toBeInstanceOf(MemoryCheckpointer);
  });

  it("TC28_07_create_snapshot_defaults", () => {
    const snap = createSnapshot(baseConfig, { x: 1 });
    expect(snap.values).toEqual({ x: 1 });
    expect(snap.next).toEqual([]);
    expect(snap.config.threadId).toBe("thread_1");
    expect(snap.config.checkpointNs).toBe("");
    expect(snap.metadata).toEqual({});
    expect(snap.createdAt).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(snap.parentConfig).toBeNull();
    expect(snap.tasks).toEqual([]);
  });

  it("TC28_08_serialize_and_deserialize_roundtrip", () => {
    const original: StateSnapshot = {
      values: { a: 1, b: "hi" },
      next: ["nodeA", "nodeB"],
      config: { threadId: "t1", checkpointNs: "ns1", checkpointId: "cp1" },
      metadata: { source: "test", step: 2 },
      createdAt: "2026-01-01T00:00:00Z",
      parentConfig: { threadId: "t0", checkpointNs: "" },
      tasks: [{ id: "task1", name: "node1", interrupts: [] }],
    };
    const serialized = serializeSnapshot(original);
    const restored = deserializeSnapshot(serialized);
    expect(restored.values).toEqual(original.values);
    expect(restored.next).toEqual(original.next);
    expect(restored.config.threadId).toBe("t1");
    expect(restored.config.checkpointNs).toBe("ns1");
    expect(restored.config.checkpointId).toBe("cp1");
    expect(restored.metadata).toEqual(original.metadata);
    expect(restored.createdAt).toBe("2026-01-01T00:00:00Z");
    expect(restored.parentConfig).toEqual({ threadId: "t0", checkpointNs: "" });
    expect(restored.tasks).toHaveLength(1);
    expect(restored.tasks[0]!.id).toBe("task1");
  });

  it("TC28_09_deserialize_invalid_throws", () => {
    expect(() => deserializeSnapshot("not an object")).toThrow();
    expect(() => deserializeSnapshot(null)).toThrow();
    expect(() => deserializeSnapshot([1, 2, 3])).toThrow();
  });
});
