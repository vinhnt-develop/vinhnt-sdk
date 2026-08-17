import { describe, expect, it, vi } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { evaluateStopConditions, toToolCallOutcome, parseJudgeVerdict, buildJudgeMessages } from "@vinhnt-sdk/step-executor";
import type { StepVerificationContext, TerminationPolicy, ToolCallOutcome } from "@vinhnt-sdk/step-executor";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import type { KnownRunEvent, RunEvent } from "@vinhnt-sdk/core";

const testCtx = {
  requestId: "term-req-1",
  traceId: "term-trace-1",
  actorId: "test-actor-1",
  tenantId: "test-tenant-1",
} as const;

function findEvent<T extends KnownRunEvent["type"]>(events: readonly RunEvent[], type: T): Extract<KnownRunEvent, { type: T }> | undefined {
  return events.find((e) => e.type === type) as Extract<KnownRunEvent, { type: T }> | undefined;
}

function makeCtx(outcomes: readonly ToolCallOutcome[]): StepVerificationContext {
  return {
    runId: "run-test" as const,
    step: 0,
    finalOutput: "",
    totalInputTokens: 100,
    totalOutputTokens: 50,
    lastStepToolOutcomes: outcomes,
  };
}

describe("termination — evaluateStopConditions", () => {
  it("tool-output matches when exitCode matches (stop-when-build-green)", () => {
    const cond = evaluateStopConditions(
      [{ kind: "tool-output", tool: "run_build", expect: { exitCode: 0 } }],
      makeCtx([{ toolName: "run_build", exitCode: 0, output: "build ok" }]),
    );
    expect(cond).toMatchObject({ kind: "tool-output", tool: "run_build" });
  });

  it("tool-output does not match on non-zero exitCode", () => {
    const cond = evaluateStopConditions(
      [{ kind: "tool-output", tool: "run_build", expect: { exitCode: 0 } }],
      makeCtx([{ toolName: "run_build", exitCode: 1, output: "build failed" }]),
    );
    expect(cond).toBeUndefined();
  });

  it("tool-output matches on any output when no exitCode expected", () => {
    const cond = evaluateStopConditions(
      [{ kind: "tool-output", tool: "run_build", expect: {} }],
      makeCtx([{ toolName: "run_build", output: "ok" }]),
    );
    expect(cond).toBeDefined();
  });

  it("tool-output does not match when tool was not invoked this step", () => {
    const cond = evaluateStopConditions(
      [{ kind: "tool-output", tool: "run_build", expect: { exitCode: 0 } }],
      makeCtx([{ toolName: "run_test", exitCode: 0 }]),
    );
    expect(cond).toBeUndefined();
  });

  it("state predicate decides deterministically", () => {
    const stop = evaluateStopConditions(
      [{ kind: "state", predicate: (c) => c.totalInputTokens > 90 }],
      makeCtx([]),
    );
    expect(stop).toMatchObject({ kind: "state" });

    const go = evaluateStopConditions(
      [{ kind: "state", predicate: (c) => c.totalInputTokens > 10_000 }],
      makeCtx([]),
    );
    expect(go).toBeUndefined();
  });

  it("external-infrastructure kinds (file-unchanged/screenshot/llm-judge) return undefined", () => {
    const conds = evaluateStopConditions(
      [
        { kind: "file-unchanged", path: "src/index.ts" },
        { kind: "screenshot" },
        { kind: "llm-judge", agent: "reviewer", criteria: ["no regressions"] },
      ],
      makeCtx([]),
    );
    expect(conds).toBeUndefined();
  });
});

describe("termination — toToolCallOutcome", () => {
  it("string output becomes plain outcome", () => {
    expect(toToolCallOutcome("echo", "hello")).toEqual({ toolName: "echo", output: "hello" });
  });

  it("structured { output, exitCode } extracts both", () => {
    expect(toToolCallOutcome("run_build", { output: "green", exitCode: 0 })).toEqual({
      toolName: "run_build", output: "green", exitCode: 0,
    });
  });

  it("non-string non-object output yields bare outcome", () => {
    expect(toToolCallOutcome("echo", 42)).toEqual({ toolName: "echo" });
  });
});

describe("termination — judge helpers", () => {
  it("parseJudgeVerdict extracts met flag tolerantly", () => {
    expect(parseJudgeVerdict('{"met": true}')).toEqual({ met: true });
    expect(parseJudgeVerdict('Here is my JSON: {"met": false}')).toEqual({ met: false });
    expect(parseJudgeVerdict("no verdict here")).toEqual({ met: false });
  });

  it("buildJudgeMessages includes criteria, output and tool evidence", () => {
    const messages = buildJudgeMessages(
      { kind: "llm-judge", agent: "reviewer", criteria: ["build green", "no regressions"] },
      makeCtx([{ toolName: "run_build", exitCode: 0, output: "ok" }]),
    );
    const joined = messages.map((m) => m.content).join("\n");
    expect(joined).toContain("build green");
    expect(joined).toContain("no regressions");
    expect(joined).toContain("run_build");
  });
});

describe("termination — kernel integration", () => {
  it("tool-output stop condition cuts the loop before the next model call", async () => {
    const build = new FakeTool("run_build", async () => ({ output: "build ok", exitCode: 0 }));
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "c1", name: "run_build", args: {} }] },
      { content: "This response must never be generated" },
    ]);
    const store = new FakeRunEventStore();
    const termination: TerminationPolicy = {
      stopConditions: [{ kind: "tool-output", tool: "run_build", expect: { exitCode: 0 } }],
    };
    const kernel = new AgentKernel({ model, store, tools: [build], maxSteps: 10, termination });

    const handle = kernel.run("Build and stop when green", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
    expect(completed?.data).toMatchObject({ stopCondition: "tool-output" });
    expect(model.generated).toBe(1);
  });

  it("token budget cut fails the run", async () => {
    const tool = new FakeTool("echo", async (input) => input);
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "c1", name: "echo", args: { msg: "a" } }] },
      { content: "answer" },
    ]);
    const store = new FakeRunEventStore();
    const termination: TerminationPolicy = { budgetTokens: { total: 1 } };
    const kernel = new AgentKernel({ model, store, tools: [tool], maxSteps: 10, termination });

    const handle = kernel.run("Do work", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("failed");
    expect(String(completed?.data.error)).toMatch(/budget/i);
    expect(model.generated).toBe(1);
  });

  it("termination.maxSteps overrides the kernel default cap", async () => {
    const model = new FakeModelProvider([{ content: "step one" }]);
    const store = new FakeRunEventStore();
    const termination: TerminationPolicy = { maxSteps: 2 };
    const kernel = new AgentKernel({ model, store, tools: [], maxSteps: 10, termination });

    const handle = kernel.run("Limited run", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
    // Only one model response was queued; a second loop pass would fall back to echo.
    expect(model.generated).toBe(1);
  });

  it("stopHook can terminate the run early as success", async () => {
    const tool = new FakeTool("poke", async () => ({ output: "poke" }));
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "c1", name: "poke", args: {} }] },
      { content: "unused" },
    ]);
    const store = new FakeRunEventStore();
    const onStepEnded = vi.fn(async () => "stop" as const);
    const termination: TerminationPolicy = { stopHooks: [{ onStepEnded }] };
    const kernel = new AgentKernel({ model, store, tools: [tool], maxSteps: 10, termination });

    const handle = kernel.run("Stop via hook", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
    expect(completed?.data).toMatchObject({ stopCondition: "stop-hook" });
    expect(onStepEnded).toHaveBeenCalledTimes(1);
    expect(model.generated).toBe(1);
  });

  it("llm-judge stops the run when the evaluator verdict is met", async () => {
    const build = new FakeTool("run_build", async () => ({ output: "build ok", exitCode: 0 }));
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "c1", name: "run_build", args: {} }] },
      { content: '{"met": true}' },
    ]);
    const store = new FakeRunEventStore();
    const termination: TerminationPolicy = {
      stopConditions: [{ kind: "llm-judge", agent: "reviewer", criteria: ["build is green"] }],
    };
    const kernel = new AgentKernel({ model, store, tools: [build], maxSteps: 10, termination });

    const handle = kernel.run("Fix the build", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
    expect(completed?.data).toMatchObject({ stopCondition: "llm-judge" });
    // 1 main model call + 1 judge call — loop stopped before another main call.
    expect(model.generated).toBe(2);
  });

  it("llm-judge continues when the evaluator verdict is not met", async () => {
    const build = new FakeTool("run_build", async () => ({ output: "build ok", exitCode: 0 }));
    const model = new FakeModelProvider([
      { content: "", toolCalls: [{ id: "c1", name: "run_build", args: {} }] },
      { content: '{"met": false}' },
      { content: "final answer" },
    ]);
    const store = new FakeRunEventStore();
    const termination: TerminationPolicy = {
      stopConditions: [{ kind: "llm-judge", agent: "reviewer", criteria: ["all tests pass"] }],
    };
    const kernel = new AgentKernel({ model, store, tools: [build], maxSteps: 10, termination });

    const handle = kernel.run("Fix the build", testCtx);
    await handle.completed;

    const events = await store.list(handle.runId);
    const completed = findEvent(events, "run.completed");
    expect(completed?.data.status).toBe("succeeded");
    expect(completed?.data).not.toHaveProperty("stopCondition");
    // 1 main call + 1 judge (false) + 1 final main call.
    expect(model.generated).toBe(3);
  });
});
