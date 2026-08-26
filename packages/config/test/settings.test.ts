import { describe, it, expect } from "vitest";
import { settingsNamespace, mergeLayers } from "../src/settings.js";

describe("settingsNamespace", () => {
  it("creates a branded SettingsNamespace from a string", () => {
    const ns = settingsNamespace("llm-deepseek");
    expect(ns).toBe("llm-deepseek");
  });

  it("preserves the original string value", () => {
    const ns = settingsNamespace("sandbox-policy");
    expect(ns).toBe("sandbox-policy");
  });
});

describe("mergeLayers", () => {
  it("merges base and override", () => {
    const base = { a: 1, b: 2, c: 3 };
    const override = { b: 99, c: 100 };
    const result = mergeLayers(base, override);
    expect(result).toEqual({ a: 1, b: 99, c: 100 });
  });

  it("keeps base values when override is empty", () => {
    const base = { a: 1, b: 2 };
    const override = {};
    const result = mergeLayers(base, override);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("adds new keys from override", () => {
    const base = { a: 1 } as Record<string, number>;
    const override = { b: 2 };
    const result = mergeLayers(base, override);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("does not mutate the base object", () => {
    const base = { a: 1, b: 2 };
    const override = { b: 99 };
    mergeLayers(base, override);
    expect(base).toEqual({ a: 1, b: 2 });
  });

  it("handles empty override", () => {
    const base = { a: 1, b: 2 };
    const result = mergeLayers(base, {});
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("handles empty base", () => {
    const result = mergeLayers({}, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });
});
