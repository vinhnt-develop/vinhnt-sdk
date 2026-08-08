import { describe, it, expect } from "vitest";
import { countTokens, countTokensSafe } from "../src/tokenizer.js";

describe("countTokens", () => {
  it("returns a positive number for non-empty text", () => {
    const n = countTokens("Hello, world!");
    expect(n).toBeGreaterThan(0);
  });

  it("returns 0 for empty string", () => {
    expect(countTokens("")).toBe(0);
  });

  it("uses heuristic (length/4) when no model given", () => {
    const text = "abcdefghij"; // 10 chars
    const n = countTokens(text);
    expect(n).toBe(Math.ceil(10 / 4));
  });

  it("uses o200k_base for gpt-4o models", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const n = countTokens(text, "gpt-4o");
    expect(n).toBeGreaterThan(0);
    // o200k_base should produce a different count than heuristic (length/4)
    expect(n).not.toBe(Math.ceil(text.length / 4));
  });

  it("uses cl100k_base for gpt-4 models", () => {
    const n = countTokens("Hello, world!", "gpt-4");
    expect(n).toBeGreaterThan(0);
  });

  it("matches known model to encoding via substring", () => {
    // "gpt-4o-2024-08-06" should match "gpt-4o" entry
    const n1 = countTokens("test", "gpt-4o-2024-08-06");
    const n2 = countTokens("test", "gpt-4o");
    expect(n1).toBe(n2);
  });

  it("falls back to heuristic for unknown model", () => {
    const text = "abcdefghij";
    const n = countTokens(text, "unknown-model-xyz");
    expect(n).toBe(Math.ceil(10 / 4));
  });

  it("handles Claude models", () => {
    const n = countTokens("Hello, world!", "claude-3-opus-20240229");
    expect(n).toBeGreaterThan(0);
  });

  it("handles unicode text", () => {
    const n = countTokens("日本語テスト 🔐", "gpt-4o");
    expect(n).toBeGreaterThan(0);
  });
});

describe("countTokensSafe", () => {
  it("returns same as countTokens for valid input", () => {
    const a = countTokens("Hello", "gpt-4o");
    const b = countTokensSafe("Hello", "gpt-4o");
    expect(a).toBe(b);
  });

  it("falls back to heuristic on error", () => {
    // Should not throw even with problematic input
    const n = countTokensSafe("");
    expect(n).toBe(0);
  });
});
