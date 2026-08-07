import { describe, expect, it } from "vitest";
import { AiSdkModelProvider } from "../src/ai-sdk-adapter.js";

describe("AiSdkModelProvider (Anthropic)", () => {
  it("creates Anthropic instance", () => {
    const p = new AiSdkModelProvider("anthropic", "claude-sonnet-4-20250514", "sk-ant-test");
    expect(p.model).toBe("claude-sonnet-4-20250514");
    expect(p.pricing).toBeUndefined();
  });

  it("generate() throws when API key is missing", async () => {
    const p = new AiSdkModelProvider("anthropic", "claude-sonnet-4-20250514", "");
    await expect(p.generate({ messages: [{ role: "user", content: "hi" }], tools: [] }))
      .rejects.toThrow();
  });

  it("countTokens works", () => {
    const p = new AiSdkModelProvider("anthropic", "claude-sonnet-4-20250514", "sk-ant-test");
    expect(p.countTokens("Hello world, this is a test.")).toBeGreaterThan(0);
  });
});
