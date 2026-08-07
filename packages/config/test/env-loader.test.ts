import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findEnvFile, loadEnvFile, ensureVntApiToken } from "../src/env-loader.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "vnt-env-"));
  delete process.env.VNT_API_TOKEN;
  delete process.env.VNT_TEST_VAR;
});

afterEach(() => {
  delete process.env.VNT_API_TOKEN;
  delete process.env.VNT_TEST_VAR;
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("findEnvFile", () => {
  it("finds .env in the start dir", () => {
    writeFileSync(join(tmpDir, ".env"), "A=1\n");
    const found = findEnvFile(tmpDir);
    expect(found).toBe(join(tmpDir, ".env"));
  });

  it("walks up parent dirs to find .env", () => {
    const child = join(tmpDir, "a", "b");
    writeFileSync(join(tmpDir, ".env"), "A=1\n");
    const found = findEnvFile(child);
    expect(found).toBe(join(tmpDir, ".env"));
  });

  it("returns null when no .env exists", () => {
    expect(findEnvFile(tmpDir)).toBeNull();
  });
});

describe("loadEnvFile", () => {
  it("loads .env values into process.env", () => {
    writeFileSync(join(tmpDir, ".env"), "VNT_TEST_VAR=hello\n");
    loadEnvFile(tmpDir);
    expect(process.env.VNT_TEST_VAR).toBe("hello");
  });

  it("does NOT override existing env vars", () => {
    writeFileSync(join(tmpDir, ".env"), "VNT_TEST_VAR=from-file\n");
    process.env.VNT_TEST_VAR = "from-shell";
    loadEnvFile(tmpDir);
    expect(process.env.VNT_TEST_VAR).toBe("from-shell");
  });

  it("returns null when no .env exists", () => {
    expect(loadEnvFile(tmpDir)).toBeNull();
  });
});

describe("ensureVntApiToken", () => {
  it("returns VNT_API_TOKEN when set in env", () => {
    process.env.VNT_API_TOKEN = "fixed-token";
    expect(ensureVntApiToken(tmpDir)).toBe("fixed-token");
  });

  it("reads an existing VNT_API_TOKEN from .env", () => {
    writeFileSync(join(tmpDir, ".env"), "VNT_API_TOKEN=env-token\n");
    expect(ensureVntApiToken(tmpDir)).toBe("env-token");
    expect(process.env.VNT_API_TOKEN).toBe("env-token");
  });

  it("generates and persists a token on first run", () => {
    const token = ensureVntApiToken(tmpDir);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    const envFile = join(tmpDir, ".env");
    expect(existsSync(envFile)).toBe(true);
    const content = readFileSync(envFile, "utf-8");
    expect(content).toContain(`VNT_API_TOKEN=${token}`);
  });

  it("is stable across calls (reuses persisted token)", () => {
    const first = ensureVntApiToken(tmpDir);
    delete process.env.VNT_API_TOKEN;
    const second = ensureVntApiToken(tmpDir);
    expect(second).toBe(first);
  });
});
