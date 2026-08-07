import { describe, expect, it } from "vitest";
import { AiSdkModelProvider } from "../src/ai-sdk-adapter.js";

describe("AiSdkModelProvider", () => {
  it("creates instance with full config", () => {
    const p = new AiSdkModelProvider("openai", "gpt-4o", "sk-test");
    expect(p.model).toBe("gpt-4o");
    expect(p.pricing).toBeUndefined();
    expect(p.contextLimit).toBeUndefined();
  });

  it("creates instance with minimal config", () => {
    const p = new AiSdkModelProvider("openai", "gpt-4o");
    expect(p.model).toBe("gpt-4o");
  });

  it("generate() throws when API key is missing", async () => {
    const p = new AiSdkModelProvider("openai", "gpt-4o", "");
    await expect(p.generate({ messages: [{ role: "user", content: "hi" }], tools: [] }))
      .rejects.toThrow();
  });

  it("countTokens() basic estimate", () => {
    const p = new AiSdkModelProvider("openai", "gpt-4o", "sk-test");
    const count = p.countTokens("hello world");
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10);
  });

  it("Anthropic provider initializes", () => {
    const p = new AiSdkModelProvider("anthropic", "claude-sonnet-4-20250514", "sk-ant-test");
    expect(p.model).toBe("claude-sonnet-4-20250514");
  });

  it("Ollama provider initializes", () => {
    const p = new AiSdkModelProvider("ollama", "llama3.2");
    expect(p.model).toBe("llama3.2");
  });

  it("OpenAI-compatible provider initializes", () => {
    const p = new AiSdkModelProvider("openai-compatible", "custom-model", "", "http://localhost:8080/v1");
    expect(p.model).toBe("custom-model");
  });

  it("countTokens with empty text", () => {
    const p = new AiSdkModelProvider("openai", "gpt-4o", "sk-test");
    expect(p.countTokens("")).toBe(0);
  });

  it("countTokens with long text", () => {
    const p = new AiSdkModelProvider("openai", "gpt-4o", "sk-test");
    const longText = "a".repeat(1000);
    expect(p.countTokens(longText)).toBe(125);
  });
});
