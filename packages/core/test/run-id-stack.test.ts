import { describe, expect, it } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import type { RequestId, RunId, TraceId } from "@vinhnt-sdk/core";
import type { ModelRequest, ModelResponse } from "../src/model.js";

const testCtx = {
  requestId: "req_runidstack" as RequestId,
  traceId: "trace_runidstack" as TraceId,
  actorId: "test",
  tenantId: "default",
} as const;

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => { resolve = res; });
  return { promise, resolve };
}

function stackOf(kernel: AgentKernel): RunId[] {
  return (kernel as unknown as { stateMachine: { runIdStack: RunId[] } }).stateMachine.runIdStack;
}

interface ModelCall {
  /** Resolves when generate() for this call is entered. */
  readonly reached: Promise<void>;
  readonly openReached: () => void;
  /** Blocks the call until the test opens the gate. */
  readonly gate: Promise<void>;
  readonly openGate: () => void;
}

function newCall(): ModelCall {
  const reached = deferred();
  const gate = deferred();
  return {
    reached: reached.promise,
    openReached: reached.resolve,
    gate: gate.promise,
    openGate: gate.resolve,
  };
}

function waitForGate(gate: Promise<void>, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    void gate.then(resolve);
    signal?.addEventListener(
      "abort",
      () => reject(new DOMException("The operation was aborted.", "AbortError")),
      { once: true },
    );
  });
}

/** Blocks each model call on its own gate, resolved in call order. */
class SequentialGateModel extends FakeModelProvider {
  readonly calls: ModelCall[] = [newCall(), newCall(), newCall(), newCall()];
  private next = 0;

  constructor() {
    super([]);
  }

  override async generate(_request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    const call = this.calls[this.next++]!;
    call.openReached();
    await waitForGate(call.gate, signal);
    return { provider: "fake", content: "done" };
  }
}

describe("P2.4 runIdStack (S3)", () => {
  it("TC01_same_session_sibling_is_busy_rejected_without_stack_leak", async () => {
    const model = new SequentialGateModel();
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      maxSteps: 10,
    });

    const handleA = kernel.run("first", testCtx, "session-1");
    await model.calls[0]!.reached;
    expect(stackOf(kernel)).toEqual([handleA.runId]);

    // S3 security regression: pre-fix, at(-2)=A was passed as parentRunId,
    // createRun treated B as A's child and SKIPPED the busy check entirely.
    const handleB = kernel.run("second", testCtx, "session-1");
    await expect(handleB.completed).rejects.toThrow(/busy/);

    // The busy path must drop B's stack entry by identity — only A remains.
    expect(stackOf(kernel)).toEqual([handleA.runId]);

    model.calls[0]!.openGate();
    await handleA.completed;
    expect(stackOf(kernel)).toEqual([]);
  });

  it("TC02_out_of_order_finish_pops_by_identity_not_blindly", async () => {
    const model = new SequentialGateModel();
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      maxSteps: 10,
    });

    const handleA = kernel.run("run-a", testCtx, "session-a");
    await model.calls[0]!.reached;
    const handleB = kernel.run("run-b", testCtx, "session-b");
    await model.calls[1]!.reached;
    expect(stackOf(kernel)).toEqual([handleA.runId, handleB.runId]);

    // A finishes FIRST while B still sits on top of the stack. A blind pop()
    // would discard B's entry (S3); identity-based exit keeps B.
    model.calls[0]!.openGate();
    await handleA.completed;
    expect(stackOf(kernel)).toEqual([handleB.runId]);

    model.calls[1]!.openGate();
    await handleB.completed;
    expect(stackOf(kernel)).toEqual([]);
  });

  it("TC03_explicit_parent_child_still_bypasses_session_busy", async () => {
    const model = new SequentialGateModel();
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      maxSteps: 10,
    });

    const handleA = kernel.run("parent", testCtx, "session-1");
    await model.calls[0]!.reached;

    // A child run with EXPLICIT ctx.parentRunId keeps the designed busy bypass
    // (sub-agents share the parent's session) — guard against over-tightening.
    const childCtx = { ...testCtx, parentRunId: handleA.runId };
    const handleB = kernel.run("child", childCtx, "session-1");
    await model.calls[1]!.reached;
    expect(stackOf(kernel)).toEqual([handleA.runId, handleB.runId]);

    model.calls[0]!.openGate();
    model.calls[1]!.openGate();
    await Promise.all([handleA.completed, handleB.completed]);
    expect(stackOf(kernel)).toEqual([]);
  });

  it("TC04_abort_mid_run_still_pops_its_stack_entry", async () => {
    const model = new SequentialGateModel();
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      maxSteps: 10,
    });

    const handle = kernel.run("will be aborted", testCtx, "session-abort");
    await model.calls[0]!.reached;
    expect(stackOf(kernel)).toEqual([handle.runId]);

    // Abort mid-flight: the run converges on a single `cancelled` terminal
    // outcome and the finally-pop must still remove the entry by identity
    // (a stuck entry would corrupt parent resolution for later runs).
    handle.abort();
    await handle.completed;
    expect(stackOf(kernel)).toEqual([]);

    // The session must be reusable afterwards (cleanup released the flag).
    const next = kernel.run("after abort", testCtx, "session-abort");
    await model.calls[1]!.reached;
    expect(stackOf(kernel)).toEqual([next.runId]);
    model.calls[1]!.openGate();
    await next.completed;
    expect(stackOf(kernel)).toEqual([]);
  });
});
