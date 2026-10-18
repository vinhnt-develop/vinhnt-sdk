import { describe, it, expect } from "vitest";
import { RunStateMachine, MAX_RETAINED_RUN_STATES } from "../src/run-state.js";
import type { RunId } from "@vinhnt-sdk/schema";

const runId = (s: string) => s as RunId;

describe("RunStateMachine", () => {
  it("keeps the terminal state after cleanup so post-mortem getRunState still works", () => {
    const sm = new RunStateMachine();
    sm.createRun(runId("run1"), "sess1");
    sm.setState(runId("run1"), "running");
    sm.setState(runId("run1"), "completed");

    sm.cleanupRun(runId("run1"), "sess1");

    expect(sm.getState(runId("run1"))).toBe("completed");
    expect(sm.getAbort(runId("run1"))).toBeUndefined();
  });

  it("frees the session busy flag on cleanup so the session can run again", () => {
    const sm = new RunStateMachine();
    sm.createRun(runId("run1"), "sess1");
    sm.cleanupRun(runId("run1"), "sess1");

    const second = sm.createRun(runId("run2"), "sess1");
    expect(second).not.toBeNull();
  });

  it("blocks a second run on the same session while one is active", () => {
    const sm = new RunStateMachine();
    sm.createRun(runId("run1"), "sess1");
    const second = sm.createRun(runId("run2"), "sess1");
    expect(second).toBeNull();
  });

  it("allows sub-agent runs to share the parent session", () => {
    const sm = new RunStateMachine();
    sm.createRun(runId("parent"), "sess1");
    const child = sm.createRun(runId("child"), "sess1", runId("parent"));
    expect(child).not.toBeNull();
  });

  it("drains pending inputs in FIFO order", () => {
    const sm = new RunStateMachine();
    sm.createRun(runId("run1"));
    sm.sendInput(runId("run1"), "first");
    sm.sendInput(runId("run1"), "second");
    expect(sm.drainInputs(runId("run1"))).toEqual(["first", "second"]);
    expect(sm.drainInputs(runId("run1"))).toEqual([]);
  });
});

describe("P5.10 runStates eviction (S15)", () => {
  function finish(sm: RunStateMachine, id: string): void {
    sm.createRun(runId(id));
    sm.setState(runId(id), "completed");
    sm.cleanupRun(runId(id));
  }

  it("TC06_fifo_eviction_keeps_only_the_configured_window", () => {
    const sm = new RunStateMachine({ retainedTerminalStates: 3 });
    for (let i = 0; i < 10; i++) finish(sm, `run-${i}`);

    expect(sm.getState(runId("run-9"))).toBe("completed");
    expect(sm.getState(runId("run-8"))).toBe("completed");
    expect(sm.getState(runId("run-7"))).toBe("completed");
    expect(sm.getState(runId("run-6"))).toBeUndefined();
    expect(sm.getState(runId("run-0"))).toBeUndefined();
  });

  it("TC07_active_run_state_is_never_evicted", () => {
    const sm = new RunStateMachine({ retainedTerminalStates: 1 });
    sm.createRun(runId("keep"));
    sm.setState(runId("keep"), "running");

    finish(sm, "done-1");
    finish(sm, "done-2");

    expect(sm.getState(runId("keep"))).toBe("running");
    expect(sm.getState(runId("done-2"))).toBe("completed");
    expect(sm.getState(runId("done-1"))).toBeUndefined();
  });

  it("TC08_recreated_run_is_unretired_so_later_evictions_keep_its_state", () => {
    const sm = new RunStateMachine({ retainedTerminalStates: 1 });
    finish(sm, "recycled");
    // Same id starts a new run before the FIFO reaches it.
    sm.createRun(runId("recycled"));
    sm.setState(runId("recycled"), "running");

    finish(sm, "other");

    expect(sm.getState(runId("recycled"))).toBe("running");
    expect(sm.getState(runId("other"))).toBe("completed");
  });

  it("TC09_default_window_is_the_exported_constant", () => {
    expect(MAX_RETAINED_RUN_STATES).toBe(1000);
    const sm = new RunStateMachine();
    for (let i = 0; i < MAX_RETAINED_RUN_STATES + 2; i++) finish(sm, `bulk-${i}`);

    expect(sm.getState(runId("bulk-1"))).toBeUndefined();
    expect(sm.getState(runId("bulk-0"))).toBeUndefined();
    expect(sm.getState(runId(`bulk-${MAX_RETAINED_RUN_STATES + 1}`))).toBe("completed");
    expect(sm.getState(runId(`bulk-${MAX_RETAINED_RUN_STATES - 1}`))).toBe("completed");
  });

  it("TC10_busy_rejected_run_state_is_retired_not_leaked", () => {
    const sm = new RunStateMachine({ retainedTerminalStates: 1 });
    sm.createRun(runId("owner"), "sess1");
    const rejected = sm.createRun(runId("rejected"), "sess1");
    expect(rejected).toBeNull();
    expect(sm.getState(runId("rejected"))).toBe("pending");

    sm.setState(runId("owner"), "completed");
    sm.cleanupRun(runId("owner"), "sess1");

    expect(sm.getState(runId("owner"))).toBe("completed");
    expect(sm.getState(runId("rejected"))).toBeUndefined();
  });
});
