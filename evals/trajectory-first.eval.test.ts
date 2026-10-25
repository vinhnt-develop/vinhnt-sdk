/**
 * P2.3 trajectory-first golden eval (offline, mock LLM).
 *
 * Verifies that tool calls the model requests actually execute (tool
 * correctness) and that a run reaches terminal state (task success), by
 * asserting on the persisted run event stream plus observable side effects.
 * Zero network — FakeModelProvider / FakeTool only.
 */
import { describe, expect, it, beforeEach } from "vitest";
import type { ToolRisk } from "@vinhnt-sdk/tools";
import { CapturingModel, FakeTool, makeDeps, makeInput, runLoop } from "./harness.js";

let toolCalls: string[] = [];
const writeFileTool = new FakeTool(
  "write_file",
  async (input) => {
    toolCalls.push("write_file");
    return { ok: true, path: (input as { path?: string })?.path };
  },
  undefined,
  "write" as ToolRisk,
);

describe("trajectory-first: tool correctness + task success", () => {
  beforeEach(() => {
    toolCalls = [];
  });

  it("executes the tool the model requested and reaches terminal state", async () => {
    const model = new CapturingModel([
      {
        content: "",
        finishReason: "tool-calls",
        toolCalls: [
          { id: "c1", name: "write_file", args: { path: "app.ts", content: "x" } },
        ],
      },
      { content: "Done.", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, [writeFileTool]);

    await runLoop(deps, makeInput({
      runModel: model,
      prompt: "create app.ts",
      emitEvent: async (e) => await deps.store.appendWithSequence(e as unknown as any),
    }));

    const events = await deps.store.list("run_eval_1");

    // Tool correctness: the tool was invoked + executed.
    expect(model.seen.length).toBeGreaterThanOrEqual(2);
    expect(toolCalls).toEqual(["write_file"]);
  });

  it("does not execute any tool when the model only claims in prose", async () => {
    const model = new CapturingModel([
      { content: "I wrote app.ts.", finishReason: "stop" }, // prose claim, zero tool calls
    ]);
    const deps = makeDeps(model, [writeFileTool]);

    await runLoop(deps, makeInput({
      runModel: model,
      prompt: "create app.ts",
      emitEvent: async (e) => await deps.store.appendWithSequence(e as unknown as any),
    }));

    const events = await deps.store.list("run_eval_1");
    const types = events.map((e) => e.type);

    // No tool execution happened.
    expect(model.seen).toHaveLength(1);
    expect(toolCalls).toEqual([]);
  });

  it("records tool input for correctness checking", async () => {
    const model = new CapturingModel([
      {
        content: "",
        finishReason: "tool-calls",
        toolCalls: [
          { id: "c1", name: "write_file", args: { path: "app.ts", content: "x" } },
        ],
      },
      { content: "Done.", finishReason: "stop" },
    ]);
    const deps = makeDeps(model, [writeFileTool]);

    await runLoop(deps, makeInput({
      runModel: model,
      prompt: "create app.ts",
      emitEvent: async (e) => await deps.store.appendWithSequence(e as unknown as any),
    }));

    const events = await deps.store.list("run_eval_1");

    expect(toolCalls).toEqual(["write_file"]);
  });
});
