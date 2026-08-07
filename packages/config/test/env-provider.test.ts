import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EnvConfigSource } from "../src/providers/env-provider.js";
import { ConfigPriority } from "../src/providers/env-provider.js";

describe("EnvConfigSource", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns null when no known env vars are set", () => {
    const src = new EnvConfigSource();
    const result = src.load();
    expect(result).toBeNull();
  });

  it("maps VNT_DEFAULT_PROVIDER to defaultProvider", () => {
    process.env.VNT_DEFAULT_PROVIDER = "anthropic";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect(result.defaultProvider).toBe("anthropic");
  });

  it("maps VNT_AUTO to boolean", () => {
    process.env.VNT_AUTO = "true";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect(result.auto).toBe(true);
  });

  it("maps VNT_AUTO=0 to false", () => {
    process.env.VNT_AUTO = "0";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect(result.auto).toBe(false);
  });

  it("maps VNT_MAX_STEPS to number", () => {
    process.env.VNT_MAX_STEPS = "50";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect(result.maxSteps).toBe(50);
  });

  it("maps VNT_LOG_LEVEL as string", () => {
    process.env.VNT_LOG_LEVEL = "debug";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect(result.logLevel).toBe("debug");
  });

  it("maps provider API key env vars to nested config", () => {
    process.env.VNT_OPENAI_API_KEY = "sk-test-123";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect(result.providers?.openai?.apiKey).toBe("sk-test-123");
  });

  it("maps multiple provider API keys", () => {
    process.env.VNT_OPENAI_API_KEY = "sk-1";
    process.env.VNT_ANTHROPIC_API_KEY = "sk-2";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect(result.providers?.openai?.apiKey).toBe("sk-1");
    expect(result.providers?.anthropic?.apiKey).toBe("sk-2");
  });

  it("maps nested config keys like network.timeout", () => {
    process.env.VNT_NETWORK_TIMEOUT = "60000";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect((result as Record<string, unknown>).network).toEqual({ timeout: 60000 });
  });

  it("maps VNT_NO_STORE to boolean", () => {
    process.env.VNT_NO_STORE = "1";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect(result.noStore).toBe(true);
  });

  it("has correct priority (EnvVar = 4)", () => {
    const src = new EnvConfigSource();
    expect(src.priority).toBe(ConfigPriority.EnvVar);
    expect(src.name).toBe("env");
  });

  it("skips empty env vars", () => {
    process.env.VNT_DEFAULT_PROVIDER = "";
    const src = new EnvConfigSource();
    const result = src.load();
    expect(result).toBeNull();
  });

  it("maps VNT_MCP_RECONNECT_MAX_RETRIES to number", () => {
    process.env.VNT_MCP_RECONNECT_MAX_RETRIES = "10";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect(result.mcpReconnectMaxRetries).toBe(10);
  });

  it("maps VNT_COMPACTION_TOKEN_BUDGET to nested number", () => {
    process.env.VNT_COMPACTION_TOKEN_BUDGET = "64000";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect((result as Record<string, unknown>).compaction).toEqual({ tokenBudget: 64000 });
  });

  it("maps VNT_LEARNING_ENABLED to nested boolean", () => {
    process.env.VNT_LEARNING_ENABLED = "true";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect((result as Record<string, unknown>).learning).toEqual({ enabled: true });
  });

  it("maps VNT_THEME_MODE to nested string", () => {
    process.env.VNT_THEME_MODE = "light";
    const src = new EnvConfigSource();
    const result = src.load()!;
    expect((result as Record<string, unknown>).theme).toEqual({ mode: "light" });
  });

  it("ignores unknown env vars", () => {
    process.env.VNT_SOME_UNKNOWN_VAR = "value";
    const src = new EnvConfigSource();
    const result = src.load();
    expect(result).toBeNull();
  });
});
