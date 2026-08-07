import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveConfig } from "../src/resolver.js";
import type { VntConfig } from "../src/schema.js";

const TEST_DIR = join(tmpdir(), "vnt-resolver-test-" + Date.now());
const SECRETS_DIR = join(TEST_DIR, "secrets");

beforeAll(() => {
  mkdirSync(SECRETS_DIR, { recursive: true });
  writeFileSync(join(SECRETS_DIR, "openai-key.txt"), "sk-from-file-123\n", "utf-8");
  writeFileSync(join(SECRETS_DIR, "base-url.txt"), "https://custom.api.com/v1\n", "utf-8");
  writeFileSync(join(TEST_DIR, "root-key.txt"), "sk-root-file\n", "utf-8");
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("resolveConfig", () => {
  it("passes through config without env vars", () => {
    const input: VntConfig = {
      defaultProvider: "ollama",
      defaultModel: "llama3.2",
      providers: { ollama: { apiKey: "", baseUrl: "http://localhost:11434/v1" } },
    };
    const result = resolveConfig(input);
    expect(result).toEqual(input);
  });

  it("resolves {env:VAR} from process.env", () => {
    process.env.TEST_API_KEY = "sk-test123";
    const input: VntConfig = {
      defaultProvider: "openai",
      defaultModel: "gpt-4o",
      providers: { openai: { apiKey: "{env:TEST_API_KEY}", baseUrl: "https://api.openai.com/v1" } },
    };
    const result = resolveConfig(input);
    expect(result.providers.openai?.apiKey).toBe("sk-test123");
    delete process.env.TEST_API_KEY;
  });

  it("resolves missing env var to empty string", () => {
    const input: VntConfig = {
      defaultProvider: "openai",
      defaultModel: "gpt-4o",
      providers: { openai: { apiKey: "{env:MISSING_VAR}", baseUrl: "" } },
    };
    const result = resolveConfig(input);
    expect(result.providers.openai?.apiKey).toBe("");
  });

  it("does not modify original config", () => {
    const input: VntConfig = {
      defaultProvider: "openai",
      defaultModel: "gpt-4o",
      providers: { openai: { apiKey: "{env:KEY}", baseUrl: "" } },
    };
    const result = resolveConfig(input);
    expect(input.providers.openai?.apiKey).toBe("{env:KEY}");
    expect(result.providers.openai?.apiKey).toBe("");
  });

  describe("{file:path} resolution", () => {
    it("resolves {file:path} relative to configDir", () => {
      const input: VntConfig = {
        defaultProvider: "openai",
        defaultModel: "gpt-4o",
        providers: { openai: { apiKey: "{file:secrets/openai-key.txt}", baseUrl: "" } },
      };
      const result = resolveConfig(input, { configDir: TEST_DIR });
      expect(result.providers.openai?.apiKey).toBe("sk-from-file-123");
    });

    it("resolves {file:path} with absolute path", () => {
      const input: VntConfig = {
        defaultProvider: "openai",
        defaultModel: "gpt-4o",
        providers: { openai: { apiKey: `{file:${join(SECRETS_DIR, "openai-key.txt")}}`, baseUrl: "" } },
      };
      const result = resolveConfig(input);
      expect(result.providers.openai?.apiKey).toBe("sk-from-file-123");
    });

    it("throws on missing file", () => {
      const input: VntConfig = {
        defaultProvider: "openai",
        defaultModel: "gpt-4o",
        providers: { openai: { apiKey: "{file:secrets/nonexistent.txt}", baseUrl: "" } },
      };
      expect(() => resolveConfig(input, { configDir: TEST_DIR })).toThrow("Referenced file not found");
    });

    it("throws on path traversal", () => {
      const input: VntConfig = {
        defaultProvider: "openai",
        defaultModel: "gpt-4o",
        providers: { openai: { apiKey: "{file:../../etc/passwd}", baseUrl: "" } },
      };
      expect(() => resolveConfig(input, { configDir: TEST_DIR })).toThrow("Path traversal detected");
    });

    it("resolves mixed {env:VAR} and {file:path}", () => {
      process.env.TEST_BASE_URL = "https://env-override.com/v1";
      const input: VntConfig = {
        defaultProvider: "openai",
        defaultModel: "gpt-4o",
        providers: {
          openai: {
            apiKey: "{file:secrets/openai-key.txt}",
            baseUrl: "{env:TEST_BASE_URL}",
          },
        },
      };
      const result = resolveConfig(input, { configDir: TEST_DIR });
      expect(result.providers.openai?.apiKey).toBe("sk-from-file-123");
      expect(result.providers.openai?.baseUrl).toBe("https://env-override.com/v1");
      delete process.env.TEST_BASE_URL;
    });
  });
});
