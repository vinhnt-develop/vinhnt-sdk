import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createCreateSkillTool } from "../src/skill/create-skill-tool.js";
import type { ToolContext } from "@vinhnt-sdk/tools";

function makeCtx(ask: ToolContext["ask"] = async () => "reject"): ToolContext {
  return {
    sessionId: "test", runId: "test", agentId: "test", agentName: "test",
    signal: new AbortController().signal, env: {},
    ask,
    metadata: () => {},
    setCompensation: () => {},
  };
}

const cleaned: string[] = [];
function makeWorkspace(): { ws: string; outside: string } {
  const base = mkdtempSync(join(tmpdir(), "vnt-skill-"));
  cleaned.push(base);
  const ws = join(base, "ws");
  const outside = join(base, "outside");
  mkdirSync(ws);
  mkdirSync(outside);
  return { ws, outside };
}

describe("createCreateSkillTool", () => {
  afterEach(() => {
    for (const p of cleaned.splice(0)) rmSync(p, { recursive: true, force: true });
  });

  it("returns a tool with correct id and risk", () => {
    const tool = createCreateSkillTool();
    expect(tool.id).toBe("create_skill");
    expect(tool.risk).toBe("write");
  });

  it("creates SKILL.md with frontmatter and instructions", async () => {
    const { ws } = makeWorkspace();
    const tool = createCreateSkillTool(ws);
    const result = await tool.execute({
      name: "my-skill",
      description: "A test skill",
      instructions: "Do the thing",
      directory: "out/skills",
    }, makeCtx());

    expect(result).toContain("my-skill");
    expect(result).toContain(join(ws, "out", "skills"));

    const content = await readFile(join(ws, "out", "skills", "SKILL.md"), "utf-8");
    expect(content).toContain("name: my-skill");
    expect(content).toContain("description: A test skill");
    expect(content).toContain("Do the thing");
  });

  it("includes tools in frontmatter when provided", async () => {
    const { ws } = makeWorkspace();
    const tool = createCreateSkillTool(ws);
    await tool.execute({
      name: "with-tools",
      description: "Has tools",
      instructions: "Use tools",
      tools: ["read_file", "execute_command"],
      directory: "sk",
    }, makeCtx());

    const content = await readFile(join(ws, "sk", "SKILL.md"), "utf-8");
    expect(content).toContain("tools:");
    expect(content).toContain("- read_file");
    expect(content).toContain("- execute_command");
  });

  it("includes color in frontmatter when provided", async () => {
    const { ws } = makeWorkspace();
    const tool = createCreateSkillTool(ws);
    await tool.execute({
      name: "colored",
      description: "Has color",
      instructions: "Instructions",
      color: "#ff6b6b",
      directory: "sk",
    }, makeCtx());

    const content = await readFile(join(ws, "sk", "SKILL.md"), "utf-8");
    expect(content).toContain("color: #ff6b6b");
  });

  it("creates parent directories recursively when they do not exist", async () => {
    const { ws } = makeWorkspace();
    const tool = createCreateSkillTool(ws);
    const result = await tool.execute({
      name: "nested-skill",
      description: "Nested dir",
      instructions: "Instructions",
      directory: join("a", "b", "c"),
    }, makeCtx());

    expect(result).toContain("nested-skill");
    const content = await readFile(join(ws, "a", "b", "c", "SKILL.md"), "utf-8");
    expect(content).toContain("name: nested-skill");
  });

  it("writes to the default .vnt/skills/<name> when no directory is given", async () => {
    const { ws } = makeWorkspace();
    const tool = createCreateSkillTool(ws);
    await tool.execute({
      name: "default-dir",
      description: "Default dir",
      instructions: "Instructions",
    }, makeCtx());

    const content = await readFile(join(ws, ".vnt", "skills", "default-dir", "SKILL.md"), "utf-8");
    expect(content).toContain("name: default-dir");
  });

  it("rejects a directory outside the workspace", async () => {
    const { ws, outside } = makeWorkspace();
    const tool = createCreateSkillTool(ws);
    await expect(
      tool.execute({
        name: "evil",
        description: "desc",
        instructions: "instr",
        directory: join("..", "outside", "skills"),
      }, makeCtx()),
    ).rejects.toThrow("outside workspace");
  });

  it("rejects a symlinked directory that resolves outside the workspace", async () => {
    const { ws, outside } = makeWorkspace();
    symlinkSync(outside, join(ws, "leak"), "junction");

    const tool = createCreateSkillTool(ws);
    await expect(
      tool.execute({
        name: "evil",
        description: "desc",
        instructions: "instr",
        directory: "leak",
      }, makeCtx()),
    ).rejects.toThrow("outside workspace");
  });

  it("allows external directories only when externalDirAccess is enabled", async () => {
    const { ws, outside } = makeWorkspace();
    const tool = createCreateSkillTool(ws, true);
    await tool.execute({
      name: "external",
      description: "desc",
      instructions: "instr",
      directory: join(outside, "sk", "external"),
    }, makeCtx());

    const content = await readFile(join(outside, "sk", "external", "SKILL.md"), "utf-8");
    expect(content).toContain("name: external");
  });

  it("prompts the user when directory is an explicit external path", async () => {
    const { ws, outside } = makeWorkspace();
    let asked = false;
    const tool = createCreateSkillTool(ws);
    await tool.execute({
      name: "external-prompt",
      description: "desc",
      instructions: "instr",
      directory: join(outside, "sk2", "external"),
    }, makeCtx(async (_input) => { asked = true; return "always"; }));

    expect(asked).toBe(true);
    const content = await readFile(join(outside, "sk2", "external", "SKILL.md"), "utf-8");
    expect(content).toContain("name: external-prompt");
  });

  it("rejects empty name", async () => {
    const { ws } = makeWorkspace();
    const tool = createCreateSkillTool(ws);
    await expect(
      tool.execute({ name: "", description: "desc", instructions: "instr" }, makeCtx()),
    ).rejects.toThrow("name");
  });

  it("rejects empty description", async () => {
    const { ws } = makeWorkspace();
    const tool = createCreateSkillTool(ws);
    await expect(
      tool.execute({ name: "test", description: "", instructions: "instr" }, makeCtx()),
    ).rejects.toThrow("description");
  });

  it("rejects empty instructions", async () => {
    const { ws } = makeWorkspace();
    const tool = createCreateSkillTool(ws);
    await expect(
      tool.execute({ name: "test", description: "desc", instructions: "" }, makeCtx()),
    ).rejects.toThrow("instructions");
  });
});
