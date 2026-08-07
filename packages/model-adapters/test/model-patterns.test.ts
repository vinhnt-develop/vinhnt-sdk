import { describe, expect, it } from "vitest";
import { matchProvider } from "../src/model-patterns.js";

describe("matchProvider", () => {
  it("matches OpenAI models", () => {
    expect(matchProvider("gpt-4o")).toBe("openai");
    expect(matchProvider("gpt-4o-mini")).toBe("openai");
    expect(matchProvider("gpt-4-turbo")).toBe("openai");
    expect(matchProvider("o1-mini")).toBe("openai");
    expect(matchProvider("o1-preview")).toBe("openai");
  });

  it("matches Anthropic models", () => {
    expect(matchProvider("claude-sonnet-4-20250514")).toBe("anthropic");
    expect(matchProvider("claude-3-opus-20240229")).toBe("anthropic");
    expect(matchProvider("claude-haiku-3")).toBe("anthropic");
  });

  it("matches Gemini models", () => {
    expect(matchProvider("gemini-2.5-flash")).toBe("gemini");
    expect(matchProvider("gemini-2.5-pro")).toBe("gemini");
    expect(matchProvider("gemini-1.5-pro")).toBe("gemini");
  });

  it("matches Mistral models", () => {
    expect(matchProvider("mistral-large-latest")).toBe("mistral");
    expect(matchProvider("mistral-small-latest")).toBe("mistral");
    expect(matchProvider("pixtral-large-latest")).toBe("mistral");
    expect(matchProvider("codestral-latest")).toBe("mistral");
  });

  it("matches DeepSeek models", () => {
    expect(matchProvider("deepseek-chat")).toBe("deepseek");
    expect(matchProvider("deepseek-coder")).toBe("deepseek");
  });

  it("matches Groq models (llama, mixtral)", () => {
    expect(matchProvider("llama-3.3-70b-versatile")).toBe("groq");
    expect(matchProvider("mixtral-8x7b-32768")).toBe("groq");
    expect(matchProvider("gemma2-9b-it")).toBe("groq");
  });

  it("matches Perplexity models", () => {
    expect(matchProvider("sonar-pro")).toBe("perplexity");
    expect(matchProvider("sonar-reasoning")).toBe("perplexity");
    expect(matchProvider("pplx-7b-online")).toBe("perplexity");
  });

  it("matches Cohere models", () => {
    expect(matchProvider("command-r")).toBe("cohere");
    expect(matchProvider("command-r-plus")).toBe("cohere");
  });

  it("returns null for unknown model", () => {
    expect(matchProvider("completely-unknown-model")).toBeNull();
    expect(matchProvider("")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(matchProvider("GPT-4O")).toBe("openai");
    expect(matchProvider("Claude-Sonnet-4")).toBe("anthropic");
  });
});
