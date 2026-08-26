import { describe, it, expect } from "vitest";
import { resolveEnv, parseEnvFile, resolveCredentialFromEnv, resolveCredentialMultiLayer } from "../src/env.js";
import { credentialRef } from "../src/credentials.js";

describe("resolveEnv", () => {
  it("creates an EnvSnapshot from a record", () => {
    const env = resolveEnv({ FOO: "bar", BAZ: "123" });
    expect(env.get("FOO")).toBe("bar");
    expect(env.get("BAZ")).toBe("123");
  });

  it("returns undefined for missing keys", () => {
    const env = resolveEnv({ FOO: "bar" });
    expect(env.get("MISSING")).toBeUndefined();
  });

  it("has() checks key existence", () => {
    const env = resolveEnv({ FOO: "bar" });
    expect(env.has("FOO")).toBe(true);
    expect(env.has("MISSING")).toBe(false);
  });

  it("all() returns the full record", () => {
    const env = resolveEnv({ A: "1", B: "2" });
    const all = env.all();
    expect(all).toEqual({ A: "1", B: "2" });
  });

  it("handles undefined values in the record", () => {
    const env = resolveEnv({ FOO: "bar", MISSING: undefined });
    expect(env.get("FOO")).toBe("bar");
    expect(env.get("MISSING")).toBeUndefined();
    expect(env.has("MISSING")).toBe(true);
  });
});

describe("parseEnvFile", () => {
  it("parses simple KEY=value pairs", () => {
    const result = parseEnvFile("FOO=bar\nBAZ=123");
    expect(result).toEqual({ FOO: "bar", BAZ: "123" });
  });

  it("handles quoted values", () => {
    const result = parseEnvFile('FOO="hello world"\nBAR=\'single quotes\'');
    expect(result).toEqual({ FOO: "hello world", BAR: "single quotes" });
  });

  it("skips comments", () => {
    const result = parseEnvFile("# This is a comment\nFOO=bar\n# Another comment");
    expect(result).toEqual({ FOO: "bar" });
  });

  it("skips blank lines", () => {
    const result = parseEnvFile("FOO=bar\n\n\nBAZ=123");
    expect(result).toEqual({ FOO: "bar", BAZ: "123" });
  });

  it("handles equals signs in values", () => {
    const result = parseEnvFile("DATABASE_URL=postgres://user:pass@host/db?opt=1");
    expect(result.DATABASE_URL).toBe("postgres://user:pass@host/db?opt=1");
  });

  it("handles empty content", () => {
    const result = parseEnvFile("");
    expect(result).toEqual({});
  });

  it("handles lines without equals sign", () => {
    const result = parseEnvFile("INVALID_LINE\nFOO=bar");
    expect(result).toEqual({ FOO: "bar" });
  });

  it("trims whitespace around keys and values", () => {
    const result = parseEnvFile("  FOO  =  bar  ");
    expect(result).toEqual({ FOO: "bar" });
  });
});

describe("resolveCredentialFromEnv", () => {
  it("resolves an existing env var", () => {
    const env = resolveEnv({ MY_KEY: "secret123" });
    const ref = credentialRef("MY_KEY");
    const result = resolveCredentialFromEnv(env, ref);
    expect(result).toEqual({ value: "secret123", source: "env" });
  });

  it("returns undefined for missing env var", () => {
    const env = resolveEnv({});
    const ref = credentialRef("MISSING_KEY");
    const result = resolveCredentialFromEnv(env, ref);
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty string value", () => {
    const env = resolveEnv({ MY_KEY: "" });
    const ref = credentialRef("MY_KEY");
    const result = resolveCredentialFromEnv(env, ref);
    expect(result).toBeUndefined();
  });
});

describe("resolveCredentialMultiLayer", () => {
  it("resolves from process env (highest priority)", () => {
    const env = resolveEnv({ MY_KEY: "from-env" });
    const result = resolveCredentialMultiLayer(
      {
        processEnv: env,
        managedStore: new Map([["MY_KEY", "from-managed"]]),
        projectEnv: "MY_KEY=from-project",
        userEnv: "MY_KEY=from-user",
      },
      credentialRef("MY_KEY"),
    );
    expect(result).toEqual({ value: "from-env", source: "env" });
  });

  it("falls back to managed store when env is missing", () => {
    const env = resolveEnv({});
    const result = resolveCredentialMultiLayer(
      {
        processEnv: env,
        managedStore: new Map([["MY_KEY", "from-managed"]]),
      },
      credentialRef("MY_KEY"),
    );
    expect(result).toEqual({ value: "from-managed", source: "managed" });
  });

  it("falls back to project .env when env and managed are missing", () => {
    const env = resolveEnv({});
    const result = resolveCredentialMultiLayer(
      {
        processEnv: env,
        projectEnv: "MY_KEY=from-project",
      },
      credentialRef("MY_KEY"),
    );
    expect(result).toEqual({ value: "from-project", source: "project-env" });
  });

  it("falls back to user .env when all higher layers are missing", () => {
    const env = resolveEnv({});
    const result = resolveCredentialMultiLayer(
      {
        processEnv: env,
        userEnv: "MY_KEY=from-user",
      },
      credentialRef("MY_KEY"),
    );
    expect(result).toEqual({ value: "from-user", source: "user-env" });
  });

  it("returns undefined when no layer has the credential", () => {
    const env = resolveEnv({});
    const result = resolveCredentialMultiLayer(
      { processEnv: env },
      credentialRef("MISSING_KEY"),
    );
    expect(result).toBeUndefined();
  });

  it("skips empty managed store values", () => {
    const env = resolveEnv({});
    const result = resolveCredentialMultiLayer(
      {
        processEnv: env,
        managedStore: new Map([["MY_KEY", ""]]),
        projectEnv: "MY_KEY=from-project",
      },
      credentialRef("MY_KEY"),
    );
    expect(result).toEqual({ value: "from-project", source: "project-env" });
  });
});
