import { describe, it, expect, vi } from "vitest";
import { createDefaultSessionTitleGenerator, TITLE_INPUT_TRUNCATION, TITLE_OUTPUT_TRUNCATION } from "../src/title.js";
import type { ModelProvider } from "@vinhnt-sdk/schema";

function fakeModel(response: string): ModelProvider {
  return {
    generate: vi.fn().mockResolvedValue({ content: response, usage: { inputTokens: 0, outputTokens: 0 } }),
  } as unknown as ModelProvider;
}

describe("createDefaultSessionTitleGenerator", () => {
  it("generates a title from a prompt", async () => {
    const model = fakeModel("Debug TypeScript Error");
    const gen = createDefaultSessionTitleGenerator(model);
    const title = await gen("Help me fix this TS error in kernel.ts");
    expect(title).toBe("Debug TypeScript Error");
  });

  it("truncates input to TITLE_INPUT_TRUNCATION chars", async () => {
    const model = fakeModel("Title");
    const gen = createDefaultSessionTitleGenerator(model);
    const longPrompt = "x".repeat(500);
    await gen(longPrompt);
    const call = (model.generate as any).mock.calls[0][0];
    expect(call.messages[1].content).toHaveLength(TITLE_INPUT_TRUNCATION);
  });

  it("truncates output to TITLE_OUTPUT_TRUNCATION chars", async () => {
    const model = fakeModel("A".repeat(200));
    const gen = createDefaultSessionTitleGenerator(model);
    const title = await gen("test");
    expect(title).toHaveLength(TITLE_OUTPUT_TRUNCATION);
  });

  it("strips surrounding quotes from output", async () => {
    const model = fakeModel('"My Title"');
    const gen = createDefaultSessionTitleGenerator(model);
    const title = await gen("test");
    expect(title).toBe("My Title");
  });

  it("strips single quotes from output", async () => {
    const model = fakeModel("'Another Title'");
    const gen = createDefaultSessionTitleGenerator(model);
    const title = await gen("test");
    expect(title).toBe("Another Title");
  });

  it("trims whitespace from output", async () => {
    const model = fakeModel("  Padded Title  ");
    const gen = createDefaultSessionTitleGenerator(model);
    const title = await gen("test");
    expect(title).toBe("Padded Title");
  });
});
