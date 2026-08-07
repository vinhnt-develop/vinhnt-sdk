import { describe, it, expect } from "vitest";
import { mergeConfig, deepMerge } from "../src/merge.js";
import type { VntConfig } from "../src/schema.js";

const defaultConfig: VntConfig = {
  defaultProvider: "openai",
  defaultModel: "gpt-4o",
  providers: { openai: { apiKey: "sk-old" } },
  maxSteps: 10,
};

describe("mergeConfig", () => {
  it("keeps base values when override is empty", () => {
    const result = mergeConfig(defaultConfig, {});
    expect(result.defaultProvider).toBe("openai");
    expect(result.maxSteps).toBe(10);
  });

  it("overrides top-level fields", () => {
    const result = mergeConfig(defaultConfig, { defaultProvider: "anthropic" });
    expect(result.defaultProvider).toBe("anthropic");
    expect(result.defaultModel).toBe("gpt-4o");
  });

  it("merges providers object", () => {
    const result = mergeConfig(defaultConfig, {
      providers: { anthropic: { apiKey: "sk-anthropic" } },
    });
    expect(result.providers.openai).toEqual({ apiKey: "sk-old" });
    expect(result.providers.anthropic).toEqual({ apiKey: "sk-anthropic" });
  });

  it("override providers replaces existing", () => {
    const result = mergeConfig(defaultConfig, {
      providers: { openai: { apiKey: "sk-new" } },
    });
    expect(result.providers.openai.apiKey).toBe("sk-new");
  });

  it("handles undefined override fields", () => {
    const result = mergeConfig(defaultConfig, { maxTokens: undefined });
    expect(result.maxTokens).toBeUndefined();
  });

  it("all fields from override are merged correctly", () => {
    const result = mergeConfig(defaultConfig, {
      maxSteps: 20, thinkingBudget: 1000, auto: true,
      agentDirs: ["./my-agents"], skillDirs: ["./my-skills"],
      permission: { bash: "ask" }, agents: ["custom"], skills: ["custom"],
      autoApproval: [{ tool: "read_file", target: "*" }],
    });
    expect(result.maxSteps).toBe(20);
    expect(result.thinkingBudget).toBe(1000);
    expect(result.auto).toBe(true);
    expect(result.agentDirs).toEqual(["./my-agents"]);
    expect(result.skillDirs).toEqual(["./my-skills"]);
    expect(result.permission).toEqual({ bash: "ask" });
    expect(result.agents).toEqual(["custom"]);
  });

  it("override learning replaces whole object", () => {
    const base = { ...defaultConfig, learning: { enabled: true } } as VntConfig;
    const result = mergeConfig(base, { learning: { enabled: false } as VntConfig["learning"] });
    expect(result.learning?.enabled).toBe(false);
  });
});

describe("deepMerge", () => {
  it("merges flat objects", () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 });
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("skips undefined values", () => {
    const result = deepMerge({ a: 1 }, { a: undefined, b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("recursively merges nested objects", () => {
    const result = deepMerge(
      { nested: { a: 1, b: 2 }, flat: "x" },
      { nested: { b: 3, c: 4 } },
    );
    expect(result).toEqual({ nested: { a: 1, b: 3, c: 4 }, flat: "x" });
  });

  it("replaces arrays, does not merge them", () => {
    const result = deepMerge(
      { items: [1, 2, 3] },
      { items: [4, 5] },
    );
    expect(result.items).toEqual([4, 5]);
  });

  it("handles null values", () => {
    const result = deepMerge({ a: null }, { a: { b: 1 } });
    expect(result).toEqual({ a: { b: 1 } });
  });

  it("handles empty overrides", () => {
    const result = deepMerge({ a: 1, b: 2 }, {});
    expect(result).toEqual({ a: 1, b: 2 });
  });
});
