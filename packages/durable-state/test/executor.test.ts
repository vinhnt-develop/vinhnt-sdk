/**
 * TC30 — StateGraphExecutor integration tests.
 *
 * Covers: run end-to-end with Command (update + goto) chaining nodes,
 * checkpointing before/after each node, interrupt + resume,
 * history listing, time-travel semantics.
 */

import { describe, it, expect } from "vitest";
import {
  StateGraphBuilder,
  StateGraphExecutor,
  createChannel,
  overwriteReducer,
  appendReducer,
  createMemoryCheckpointer,
  interrupt,
  Command,
} from "../src/index.js";
import type { GraphConfig } from "../src/state/checkpoint.js";
import { GraphInterrupt } from "../src/errors.js";

const baseConfig: GraphConfig = { threadId: "exec-1", checkpointNs: "" };

describe("TC30_stateGraphExecutor", () => {
  it("TC30_01_run_executes_nodes_and_applies_deltas", async () => {
    const builder = new StateGraphBuilder("ex-graph", "Executor Graph");
    builder.addChannel("step", createChannel<number>("step", 0, {
      reducer: overwriteReducer(),
      default: 0,
    }));
    builder.addChannel("log", createChannel<string[]>("log", [], {
      reducer: appendReducer(),
      default: [],
    }));
    const def = builder.build();

    const executor = new StateGraphExecutor(def, createMemoryCheckpointer());
    executor.addNode("a", async () => ({
      update: { step: 1, log: ["a"] },
      goto: "b",
    }));
    executor.addNode("b", async (state) => ({
      update: {
        step: (state.step as number) + 1,
        log: [...(state.log as string[]), "b"],
      },
      goto: "c",
    }));
    executor.addNode("c", async (state) => ({
      update: {
        step: (state.step as number) + 1,
        log: [...(state.log as string[]), "c"],
      },
    }));

    const result = await executor.run("a", baseConfig);
    expect(result.completed).toBe(true);
    expect(result.output).toBeUndefined();
    expect(result.snapshot.values).toEqual({ step: 3, log: ["a", "b", "c"] });
    expect(result.snapshot.next).toEqual([]);
  });

  it("TC30_02_run_checkpoints_before_and_after_each_node", async () => {
    const builder = new StateGraphBuilder("cp-graph", "CP Graph");
    builder.addChannel("n", createChannel<number>("n", 0, {
      reducer: overwriteReducer(),
      default: 0,
    }));
    const def = builder.build();
    const cp = createMemoryCheckpointer();
    const executor = new StateGraphExecutor(def, cp);
    executor.addNode("one", async () => ({
      update: { n: 1 },
      goto: "two",
    }));
    executor.addNode("two", async () => ({
      update: { n: 2 },
    }));

    const result = await executor.run("one", baseConfig);
    expect(result.completed).toBe(true);
    expect(result.snapshot.values).toEqual({ n: 2 });

    const history = await cp.list("exec-1");
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.some((s) => s.values.n === 2)).toBe(true);
  });

  it("TC30_03_interrupt_pauses_and_resume_continues", async () => {
    const builder = new StateGraphBuilder("hitl-graph", "HITL Graph");
    builder.addChannel("approved", createChannel<boolean>("approved", false, {
      reducer: overwriteReducer(),
      default: false,
    }));
    builder.addChannel("step", createChannel<number>("step", 0, {
      reducer: overwriteReducer(),
      default: 0,
    }));
    const def = builder.build();
    const cp = createMemoryCheckpointer();
    const executor = new StateGraphExecutor(def, cp);

    let interrupted = false;
    executor.addNode("ask", async () => {
      interrupted = true;
      interrupt("Please approve", { nodeId: "ask" });
      return {} as never;
    });

    const first = await executor.run("ask", baseConfig);
    expect(first.completed).toBe(false);
    expect(first.interrupt).not.toBeUndefined();
    expect(first.interrupt!.value).toBe("Please approve");
    expect(interrupted).toBe(true);

    // Resume: restore checkpoint state, apply update, continue
    const second = await executor.resume(
      { threadId: "exec-1", checkpointNs: "" },
      Command.resumeWithUpdate("yes", { step: 1 }),
    );
    expect(second.completed).toBe(true);
    expect(second.snapshot.values.step).toBe(1);
  });

  it("TC30_04_history_time_travel", async () => {
    const builder = new StateGraphBuilder("tt-graph", "Time Travel");
    builder.addChannel("v", createChannel<number>("v", 0, {
      reducer: overwriteReducer(),
      default: 0,
    }));
    const def = builder.build();
    const cp = createMemoryCheckpointer();
    const executor = new StateGraphExecutor(def, cp);

    executor.addNode("a", async () => ({
      update: { v: 1 },
      goto: "b",
    }));
    executor.addNode("b", async (state) => ({
      update: { v: (state.v as number) + 1 },
    }));

    const result = await executor.run("a", { threadId: "tt-1", checkpointNs: "" });
    expect(result.completed).toBe(true);
    expect(result.snapshot.values).toEqual({ v: 2 });

    const history = await cp.list("tt-1");
    expect(history.length).toBeGreaterThanOrEqual(2);
    // Newest first — at least one snapshot should have v=2, one v=1
    expect(history.some((s) => s.values.v === 2)).toBe(true);
    expect(history.some((s) => s.values.v === 1)).toBe(true);
  });

  it("TC30_05_executor_history_returns_snapshots", async () => {
    const builder = new StateGraphBuilder("h-graph", "H Graph");
    builder.addChannel("x", createChannel<number>("x", 0, {
      reducer: overwriteReducer(),
      default: 0,
    }));
    const def = builder.build();
    const cp = createMemoryCheckpointer();
    const executor = new StateGraphExecutor(def, cp);
    executor.addNode("n1", async () => ({
      update: { x: 42 },
      goto: "n2",
    }));
    executor.addNode("n2", async () => ({ update: {} }));

    const result = await executor.run("n1", baseConfig);
    expect(result.completed).toBe(true);
    expect(result.snapshot.values).toEqual({ x: 42 });

    const history = await executor.history("exec-1");
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history.some((s) => s.values.x === 42)).toBe(true);
  });

  it("TC30_06_interrupt_is_GraphInterrupt_instance", () => {
    let err: unknown;
    try {
      interrupt("x", { nodeId: "n" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(GraphInterrupt);
  });
});
