import { describe, it, expect } from "vitest";
import { OpenAICompatibleProvider } from "../src/openai-compatible-provider.js";
import { ConfigurationError } from "@vinhnt-sdk/schema";

describe("OpenAICompatibleProvider constructor validation", () => {
  it("throws ConfigurationError when defaultModel is not provided", () => {
    expect(() => {
      new OpenAICompatibleProvider({
        baseUrl: "https://api.example.com/v1",
        apiKey: "test-key",
        // defaultModel omitted
      });
    }).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when defaultModel is empty string", () => {
    expect(() => {
      new OpenAICompatibleProvider({
        baseUrl: "https://api.example.com/v1",
        apiKey: "test-key",
        defaultModel: "",
      });
    }).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when defaultModel is whitespace only", () => {
    expect(() => {
      new OpenAICompatibleProvider({
        baseUrl: "https://api.example.com/v1",
        apiKey: "test-key",
        defaultModel: "   ",
      });
    }).toThrow(ConfigurationError);
  });

  it("accepts valid defaultModel", () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://api.example.com/v1",
      apiKey: "test-key",
      defaultModel: "gpt-4o",
    });
    expect(provider.model).toBe("gpt-4o");
  });

  it("accepts valid defaultModel with providerName", () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://api.example.com/v1",
      apiKey: "test-key",
      defaultModel: "gpt-4o",
      providerName: "custom",
    });
    expect(provider.model).toBe("gpt-4o");
    expect(provider.provider).toBe("custom");
  });
});