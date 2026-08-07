import { describe, expect, it, vi } from "vitest";
import { validateConfig } from "../src/schema.js";

describe("validateConfig", () => {
  it("returns defaults for empty object", () => {
    const cfg = validateConfig({});
    expect(cfg.defaultProvider).toBe("");
    expect(cfg.defaultModel).toBe("");
    expect(cfg.providers).toEqual({});
  });

  it("preserves provided values", () => {
    const cfg = validateConfig({
      defaultProvider: "ollama",
      defaultModel: "llama3.2",
      providers: {
        ollama: { apiKey: "", baseUrl: "http://localhost:11434/v1" },
      },
    });
    expect(cfg.defaultProvider).toBe("ollama");
    expect(cfg.defaultModel).toBe("llama3.2");
    expect(cfg.providers.ollama?.apiKey).toBe("");
    expect(cfg.providers.ollama?.baseUrl).toBe("http://localhost:11434/v1");
  });

  it("rejects non-object input", () => {
    expect(() => validateConfig(null)).toThrow("Config validation failed");
    expect(() => validateConfig("string")).toThrow("Config validation failed");
  });

  it("falls back to defaults for invalid provider entries", () => {
    const cfg = validateConfig({
      providers: {
        valid: { apiKey: "key", baseUrl: "url" },
        invalid: "not an object",
      },
    });
    expect(cfg.providers.valid?.apiKey).toBe("key");
    expect(cfg.providers.invalid?.apiKey).toBe("");
    expect(cfg.providers.invalid?.baseUrl).toBe("");
  });

  it("handles partial provider config", () => {
    const cfg = validateConfig({
      providers: {
        test: {},
      },
    });
    expect(cfg.providers.test?.apiKey).toBe("");
    expect(cfg.providers.test?.baseUrl).toBe("");
  });

  describe("compaction config", () => {
    it("defaults to undefined when not provided", () => {
      const cfg = validateConfig({});
      expect(cfg.compaction).toBeUndefined();
    });

    it("parses naive compaction with defaults", () => {
      const cfg = validateConfig({ compaction: {} });
      expect(cfg.compaction).toBeDefined();
      expect(cfg.compaction!.strategy).toBe("naive");
      expect(cfg.compaction!.headCount).toBe(3);
      expect(cfg.compaction!.tailCount).toBe(20);
      expect(cfg.compaction!.tokenBudget).toBe(32000);
      expect(cfg.compaction!.maxToolOutputLength).toBe(500);
    });

    it("parses llm compaction with custom values", () => {
      const cfg = validateConfig({
        compaction: {
          strategy: "llm",
          headCount: 5,
          tailCount: 10,
          tokenBudget: 64000,
          maxToolOutputLength: 1000,
        },
      });
      expect(cfg.compaction!.strategy).toBe("llm");
      expect(cfg.compaction!.headCount).toBe(5);
      expect(cfg.compaction!.tokenBudget).toBe(64000);
    });

    it("rejects invalid strategy as naive", () => {
      const cfg = validateConfig({ compaction: { strategy: "magic" } });
      expect(cfg.compaction!.strategy).toBe("naive");
    });
  });

  describe("unknown key detection", () => {
    it("accepts valid top-level keys without warning", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      validateConfig({ defaultProvider: "openai" });
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("warns on unknown top-level keys", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      validateConfig({ totallyFakeKey: true, defaultProvider: "openai" });
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0]![0]).toContain("'totallyFakeKey'");
      warnSpy.mockRestore();
    });

    it("warns with file path prefix when filePath is provided", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      validateConfig({ bogusKey: 1 }, "/home/user/vnt.json");
      expect(warnSpy.mock.calls[0]![0]).toContain("/home/user/vnt.json");
      warnSpy.mockRestore();
    });
  });
});
