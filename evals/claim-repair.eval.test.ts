/**
 * P1-10 golden eval: claim-vs-action repair (offline, mock LLM).
 * Fixture: model claims file write in prose with finish_reason=stop and zero tool calls.
 */
import { describe, expect, it } from "vitest";
import { CapturingModel, FakeTool, makeDeps, makeInput, runLoop } from "./harness.js";

const PROSE_FILE_CLAIM =
  "I have created a new file called `app.ts` with the following content:\n\n" +
  "```typescript\nexport function main(): void {}\n```\n\nThe file is ready.";

describe("golden: claim-repair", () => {
  it("injects repair prompt when prose claims file write with zero tool calls", async () => {
    const model = new CapturingModel([
      { content: PROSE_FILE_CLAIM, finishReason: "stop" },
      {
        content: "",
        finishReason: "tool-calls",
        toolCalls: [{ id: "c1", name: "write_file", args: { path: "app.ts", content: "x" } }],
      },
    ]);
    const deps = makeDeps(model, [new FakeTool("write_file", undefined, undefined, "write")]);

    await runLoop(deps, makeInput({ runModel: model, prompt: "create app.ts" }));

    expect(model.seen.length).toBeGreaterThanOrEqual(2);
    const repairTurn = model.seen[1]!;
    const repairText = repairTurn
      .map((m) => (typeof m.content === "string" ? m.content : ""))
      .join("\n");
    expect(repairText).toMatch(/did not call write_file|did not call/i);
  });

  it("does not inject claim-repair for a plain short answer", async () => {
    const model = new CapturingModel([{ content: "42 is the answer.", finishReason: "stop" }]);
    const deps = makeDeps(model, [new FakeTool("write_file", undefined, undefined, "write")]);

    await runLoop(deps, makeInput({ runModel: model, prompt: "what is 6*7?" }));

    expect(model.seen).toHaveLength(1);
    const allText = model.seen
      .flat()
      .map((m) => (typeof m.content === "string" ? m.content : ""))
      .join("\n");
    expect(allText).not.toMatch(/did not call write_file/i);
  });
});
