import { describe, expect, it } from "vitest";
import { getCapabilities, listFeatures } from "../src/capabilities.js";

describe("getCapabilities", () => {
  it("returns all capabilities for a known provider", () => {
    const caps = getCapabilities("openai");
    expect(caps.streaming).toBe(true);
    expect(caps.tools).toBe(true);
    expect(caps.vision).toBe(true);
    expect(caps.systemPrompt).toBe(true);
  });

  it("returns thinking=true for Anthropic", () => {
    const caps = getCapabilities("anthropic");
    expect(caps.thinking).toBe(true);
  });

  it("returns tools=false for Perplexity", () => {
    const caps = getCapabilities("perplexity");
    expect(caps.tools).toBe(false);
  });

  it("returns tools=false for Replicate", () => {
    const caps = getCapabilities("replicate");
    expect(caps.tools).toBe(false);
  });

  it("returns defaults for unknown provider", () => {
    const caps = getCapabilities("nonexistent-provider");
    expect(caps.streaming).toBe(true);
    expect(caps.tools).toBe(true);
    expect(caps.thinking).toBe(false);
  });
});

describe("listFeatures", () => {
  it("returns array of features with name, label, supported", () => {
    const features = listFeatures("openai");
    expect(features.length).toBeGreaterThanOrEqual(5);
    const streaming = features.find((f) => f.name === "streaming");
    expect(streaming).toBeDefined();
    expect(streaming!.supported).toBe(true);
    expect(streaming!.label).toBe("Streaming");
  });

  it("marks thinking as supported for Anthropic", () => {
    const features = listFeatures("anthropic");
    const thinking = features.find((f) => f.name === "thinking")!;
    expect(thinking.supported).toBe(true);
  });
});
