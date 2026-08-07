import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "../src/loader.js";

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), "vnt-config-test-"));
}

describe("loadConfig", () => {
  it("returns defaults when no config files exist", () => {
    const dir = tmpDir();
    const result = loadConfig({ projectDir: dir });
    expect(result.config.defaultProvider).toBe("");
    expect(result.config.defaultModel).toBe("");
    expect(result.sources).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });

  it("loads project-level config", () => {
    const dir = tmpDir();
    writeFileSync(
      join(dir, "vnt.json"),
      JSON.stringify({
        defaultProvider: "ollama",
        defaultModel: "llama3.2",
        providers: { ollama: { apiKey: "", baseUrl: "http://localhost:11434/v1" } },
      }),
    );
    const result = loadConfig({ projectDir: dir });
    expect(result.config.defaultProvider).toBe("ollama");
    expect(result.config.defaultModel).toBe("llama3.2");
    expect(result.sources).toContain("project");
    rmSync(dir, { recursive: true, force: true });
  });

  it("resolves {env:VAR} in loaded config", () => {
    const dir = tmpDir();
    process.env.TEST_KEY = "sk-resolved";
    const result = loadConfig({ projectDir: dir });
    delete process.env.TEST_KEY;
    rmSync(dir, { recursive: true, force: true });
  });

  it("loads YAML config file (.yaml)", () => {
    const dir = tmpDir();
    writeFileSync(
      join(dir, "vnt.yaml"),
      "defaultProvider: anthropic\ndefaultModel: claude-3-opus\n",
    );
    const result = loadConfig({ projectDir: dir });
    expect(result.config.defaultProvider).toBe("anthropic");
    expect(result.config.defaultModel).toBe("claude-3-opus");
    expect(result.sources).toContain("project");
    rmSync(dir, { recursive: true, force: true });
  });

  it("loads YAML config file (.yml)", () => {
    const ymlDir = mkdtempSync(join(tmpdir(), "vnt-config-yml-"));
    writeFileSync(
      join(ymlDir, "vnt.yml"),
      "defaultProvider: gemini\ndefaultModel: gemini-pro\n",
    );
    const result = loadConfig({ projectDir: ymlDir });
    expect(result.config.defaultProvider).toBe("gemini");
    expect(result.config.defaultModel).toBe("gemini-pro");
    rmSync(ymlDir, { recursive: true, force: true });
  });

  it("prefers JSON over YAML when both exist", () => {
    const bothDir = mkdtempSync(join(tmpdir(), "vnt-config-both-"));
    writeFileSync(join(bothDir, "vnt.yaml"), "defaultProvider: anthropic\n");
    writeFileSync(join(bothDir, "vnt.json"), JSON.stringify({ defaultProvider: "openai" }));
    const result = loadConfig({ projectDir: bothDir });
    expect(result.config.defaultProvider).toBe("openai");
    rmSync(bothDir, { recursive: true, force: true });
  });

  it("loads .vnt/config.yaml inside .vnt directory", () => {
    const dotDir = mkdtempSync(join(tmpdir(), "vnt-config-dot-"));
    const vntDir = join(dotDir, ".vnt");
    mkdirSync(vntDir);
    writeFileSync(
      join(vntDir, "config.yaml"),
      "defaultProvider: ollama\nmaxSteps: 50\n",
    );
    const result = loadConfig({ projectDir: dotDir });
    expect(result.config.defaultProvider).toBe("ollama");
    expect(result.config.maxSteps).toBe(50);
    expect(result.sources).toContain("dotVnt");
    rmSync(dotDir, { recursive: true, force: true });
  });
});
