import { describe, it, expect } from "vitest";
import { RunStateMachine } from "../src/run-state.js";

describe("RunStateMachine", () => {
  it("keeps the terminal state after cleanup so post-mortem getRunState still works", () => {
    const sm = new RunStateMachine();
    sm.createRun("run1", "sess1");
    sm.setState("run1", "running");
    sm.setState("run1", "completed");

    sm.cleanupRun("run1", "sess1");

    expect(sm.getState("run1")).toBe("completed");
    expect(sm.getAbort("run1")).toBeUndefined();
  });

  it("frees the session busy flag on cleanup so the session can run again", () => {
    const sm = new RunStateMachine();
    sm.createRun("run1", "sess1");
    sm.cleanupRun("run1", "sess1");

    const second = sm.createRun("run2", "sess1");
    expect(second).not.toBeNull();
  });

  it("blocks a second run on the same session while one is active", () => {
    const sm = new RunStateMachine();
    sm.createRun("run1", "sess1");
    const second = sm.createRun("run2", "sess1");
    expect(second).toBeNull();
  });

  it("allows sub-agent runs to share the parent session", () => {
    const sm = new RunStateMachine();
    sm.createRun("parent", "sess1");
    const child = sm.createRun("child", "sess1", "parent");
    expect(child).not.toBeNull();
  });

  it("drains pending inputs in FIFO order", () => {
    const sm = new RunStateMachine();
    sm.createRun("run1");
    sm.sendInput("run1", "first");
    sm.sendInput("run1", "second");
    expect(sm.drainInputs("run1")).toEqual(["first", "second"]);
    expect(sm.drainInputs("run1")).toEqual([]);
  });
});
