import { describe, expect, it } from "vitest";
import { createModelProvider } from "../src/provider.js";
import { AiSdkModelProvider } from "../src/ai-sdk-adapter.js";

describe("createModelProvider", () => {
  it("creates OpenAI provider", () => {
    const provider = createModelProvider({
      provider: "openai",
      model: "gpt-4o",
      apiKey: "sk-test",
    });
    expect(provider).toBeInstanceOf(AiSdkModelProvider);
    expect(provider.model).toBe("gpt-4o");
  });

  it("creates Anthropic provider", () => {
    const provider = createModelProvider({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      apiKey: "sk-ant-test",
    });
    expect(provider).toBeInstanceOf(AiSdkModelProvider);
    expect(provider.model).toBe("claude-sonnet-4-20250514");
  });

  it("creates Ollama provider", () => {
    const provider = createModelProvider({
      provider: "ollama",
      model: "llama3.2",
    });
    expect(provider).toBeInstanceOf(AiSdkModelProvider);
    expect(provider.model).toBe("llama3.2");
  });

  it("creates generic OpenAI-compatible provider", () => {
    const provider = createModelProvider({
      provider: "openai-compatible",
      model: "custom-model",
      apiKey: "",
      baseUrl: "http://localhost:8080/v1",
    });
    expect(provider).toBeInstanceOf(AiSdkModelProvider);
    expect(provider.model).toBe("custom-model");
  });
});
