/**
 * P1-10 golden eval: missed_tool_calls (offline, mock LLM).
 * Fixture: finish_reason=tool_calls but zero toolCalls after repair budget exhausted.
 */
import { describe, expect, it } from "vitest";
import { CapturingModel, FakeTool, makeDeps, makeInput, runLoop } from "./harness.js";

describe("golden: missed_tool_calls", () => {
  it("repairs once when finish_reason=tool_calls yields empty toolCalls", async () => {
    const model = new CapturingModel([
      { content: "", finishReason: "tool-calls" },
      {
        content: "",
        finishReason: "tool-calls",
        toolCalls: [{ id: "c1", name: "read_file", args: { path: "a.txt" } }],
      },
      { content: "Done." },
    ]);
    const deps = makeDeps(model, [new FakeTool("read_file")]);

    await runLoop(deps, makeInput({ runModel: model }));

    expect(model.seen.length).toBeGreaterThanOrEqual(2);
    const repairText = model.seen[1]!
      .map((m) => (typeof m.content === "string" ? m.content : ""))
      .join("\n");
    expect(repairText).toMatch(/finish_reason=tool_calls but no tool calls were received/);
  });

  it("fails hard with status=failed after repair budget exhausted (missed_tool_calls)", async () => {
    const emptyToolCalls = { content: "", finishReason: "tool-calls" as const };
    const model = new CapturingModel([emptyToolCalls, emptyToolCalls, emptyToolCalls, emptyToolCalls]);
    const deps = makeDeps(model, [new FakeTool("read_file")]);

    const result = await runLoop(deps, makeInput({ runModel: model }));
    expect(result.status).toBe("failed");
    expect(model.seen.length).toBeGreaterThanOrEqual(3);
  });

  it("completes normally when toolCalls eventually arrive", async () => {
    const model = new CapturingModel([
      { content: "", finishReason: "tool-calls" },
      {
        content: "",
        finishReason: "tool-calls",
        toolCalls: [{ id: "c1", name: "read_file", args: { path: "ok.txt" } }],
      },
      { content: "Read ok." },
    ]);
    const deps = makeDeps(model, [new FakeTool("read_file", async () => "ok")]);

    const result = await runLoop(deps, makeInput({ runModel: model }));
    expect(result.status).toBe("succeeded");
  });
});
