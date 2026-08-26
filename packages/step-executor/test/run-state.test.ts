import { describe, it, expect } from "vitest";
import { RunStateMachine } from "../src/run-state.js";
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
