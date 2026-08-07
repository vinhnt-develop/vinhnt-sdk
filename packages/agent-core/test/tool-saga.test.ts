import { describe, it, expect, vi } from "vitest";
import { ToolSaga } from "../src/kernel/tool-saga.js";

describe("ToolSaga", () => {
  const entry = (overrides: Partial<Parameters<ToolSaga["record"]>[0]> = {}) => ({
    toolId: "t1",
    toolName: "read_file",
    input: { filePath: "/test.txt" },
    output: "content",
    timestamp: 1000,
    step: 1,
    ...overrides,
  });

  describe("record", () => {
    it("records entries grouped by step", () => {
      const saga = new ToolSaga();
      saga.record(entry({ toolId: "t1", step: 1 }));
      saga.record(entry({ toolId: "t2", step: 1 }));
      saga.record(entry({ toolId: "t3", step: 2 }));

      const step1 = saga.getEntries(1);
      expect(step1).toHaveLength(2);
      expect(step1[0].toolId).toBe("t1");
      expect(step1[1].toolId).toBe("t2");

      const step2 = saga.getEntries(2);
      expect(step2).toHaveLength(1);
      expect(step2[0].toolId).toBe("t3");
    });
  });

  describe("getEntries", () => {
    it("returns all entries sorted by step descending when no step specified", () => {
      const saga = new ToolSaga();
      saga.record(entry({ toolId: "t1", step: 1 }));
      saga.record(entry({ toolId: "t2", step: 2 }));
      saga.record(entry({ toolId: "t3", step: 1 }));
      saga.record(entry({ toolId: "t4", step: 3 }));

      const all = saga.getEntries();
      expect(all.map((e) => e.toolId)).toEqual(["t4", "t2", "t1", "t3"]);
    });

    it("returns empty array for unknown step", () => {
      const saga = new ToolSaga();
      expect(saga.getEntries(99)).toEqual([]);
    });

    it("returns empty array when no entries exist", () => {
      const saga = new ToolSaga();
      expect(saga.getEntries()).toEqual([]);
    });
  });

  describe("registerCompensation", () => {
    it("registers a compensation action for a toolId", () => {
      const saga = new ToolSaga();
      const action = { entry: entry(), compensate: vi.fn() };
      saga.registerCompensation("t1", action);
      expect(saga.getEntries()).toHaveLength(0);
    });
  });

  describe("rollbackStep", () => {
    it("executes compensations in reverse order and deletes step", async () => {
      const saga = new ToolSaga();
      saga.record(entry({ toolId: "t1", step: 1 }));
      saga.record(entry({ toolId: "t2", step: 1 }));

      const comp1 = vi.fn();
      const comp2 = vi.fn();
      saga.registerCompensation("t1", { entry: entry(), compensate: comp1 });
      saga.registerCompensation("t2", { entry: entry(), compensate: comp2 });

      await saga.rollbackStep(1);

      expect(comp2).toHaveBeenCalledBefore(comp1);
      expect(saga.getEntries(1)).toEqual([]);
    });

    it("handles missing compensations gracefully", async () => {
      const saga = new ToolSaga();
      saga.record(entry({ toolId: "t1", step: 1 }));
      saga.record(entry({ toolId: "t2", step: 1 }));

      const comp2 = vi.fn();
      saga.registerCompensation("t2", { entry: entry(), compensate: comp2 });

      await expect(saga.rollbackStep(1)).resolves.toBeUndefined();
      expect(comp2).toHaveBeenCalledOnce();
    });

    it("handles compensation failure gracefully", async () => {
      const saga = new ToolSaga();
      saga.record(entry({ toolId: "t1", step: 1 }));
      saga.record(entry({ toolId: "t2", step: 1 }));

      const err = new Error("compensation failed");
      saga.registerCompensation("t1", { entry: entry(), compensate: vi.fn().mockRejectedValue(err) });
      saga.registerCompensation("t2", { entry: entry(), compensate: vi.fn() });

      await expect(saga.rollbackStep(1)).resolves.toBeUndefined();
    });

    it("does nothing for unknown step", async () => {
      const saga = new ToolSaga();
      saga.record(entry({ step: 1 }));
      await expect(saga.rollbackStep(99)).resolves.toBeUndefined();
    });

    it("times out a stuck compensation after 5s instead of hanging forever", async () => {
      vi.useFakeTimers();
      try {
        const saga = new ToolSaga();
        saga.record(entry({ toolId: "t1", step: 1 }));
        let resolveNever: (v: unknown) => void = () => {};
        saga.registerCompensation("t1", {
          entry: entry(),
          compensate: vi.fn().mockReturnValue(new Promise<void>((r) => { resolveNever = r; })),
        });

        const rollbackPromise = saga.rollbackStep(1);
        await vi.advanceTimersByTimeAsync(6000);
        await rollbackPromise;
        // Even though compensate() never resolved, rollback completes (timeout caught)
        expect(saga.getEntries(1)).toEqual([]);
        resolveNever(undefined);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("rollbackAll", () => {
    it("rolls back all steps in reverse order", async () => {
      const saga = new ToolSaga();
      saga.record(entry({ toolId: "t1", step: 1 }));
      saga.record(entry({ toolId: "t2", step: 2 }));

      const calls: number[] = [];
      saga.registerCompensation("t1", {
        entry: entry(), compensate: vi.fn().mockImplementation(() => { calls.push(1); }),
      });
      saga.registerCompensation("t2", {
        entry: entry(), compensate: vi.fn().mockImplementation(() => { calls.push(2); }),
      });

      await saga.rollbackAll();

      expect(calls).toEqual([2, 1]);
      expect(saga.getEntries()).toEqual([]);
    });
  });

  describe("clear", () => {
    it("clears all entries and compensations", async () => {
      const saga = new ToolSaga();
      saga.record(entry({ step: 1 }));
      saga.registerCompensation("t1", { entry: entry(), compensate: vi.fn() });

      saga.clear();

      expect(saga.getEntries()).toEqual([]);
      // After clear, rolling back should do nothing (but also not error)
      await expect(saga.rollbackStep(1)).resolves.toBeUndefined();
    });
  });
});
