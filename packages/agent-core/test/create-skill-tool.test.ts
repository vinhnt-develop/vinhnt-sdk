import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createCreateSkillTool } from "../src/skill/create-skill-tool.js";

describe("createCreateSkillTool", () => {
  it("returns a tool with correct id and risk", () => {
    const tool = createCreateSkillTool();
    expect(tool.id).toBe("create_skill");
    expect(tool.risk).toBe("write");
  });

  it("creates SKILL.md with frontmatter and instructions", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "vnt-test-"));
    const tool = createCreateSkillTool();
    const result = await tool.execute({
      name: "my-skill",
      description: "A test skill",
      instructions: "Do the thing",
      directory: tmp,
    });

    expect(result).toContain("my-skill");
    expect(result).toContain(tmp);

    const content = await readFile(join(tmp, "SKILL.md"), "utf-8");
    expect(content).toContain("name: my-skill");
    expect(content).toContain("description: A test skill");
    expect(content).toContain("Do the thing");
  });

  it("includes tools in frontmatter when provided", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "vnt-test-"));
    const tool = createCreateSkillTool();
    await tool.execute({
      name: "with-tools",
      description: "Has tools",
      instructions: "Use tools",
      tools: ["read_file", "execute_command"],
      directory: tmp,
    });

    const content = await readFile(join(tmp, "SKILL.md"), "utf-8");
    expect(content).toContain("tools:");
    expect(content).toContain("- read_file");
    expect(content).toContain("- execute_command");
  });

  it("includes color in frontmatter when provided", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "vnt-test-"));
    const tool = createCreateSkillTool();
    await tool.execute({
      name: "colored",
      description: "Has color",
      instructions: "Instructions",
      color: "#ff6b6b",
      directory: tmp,
    });

    const content = await readFile(join(tmp, "SKILL.md"), "utf-8");
    expect(content).toContain("color: #ff6b6b");
  });

  it("creates parent directories recursively when they do not exist", async () => {
    const base = mkdtempSync(join(tmpdir(), "vnt-test-"));
    const nested = join(base, "a", "b", "c");
    const tool = createCreateSkillTool();
    const result = await tool.execute({
      name: "nested-skill",
      description: "Nested dir",
      instructions: "Instructions",
      directory: nested,
    });

    expect(result).toContain("nested-skill");
    const content = await readFile(join(nested, "SKILL.md"), "utf-8");
    expect(content).toContain("name: nested-skill");
  });

  it("rejects empty name", async () => {
    const tool = createCreateSkillTool();
    await expect(
      tool.execute({ name: "", description: "desc", instructions: "instr" }),
    ).rejects.toThrow("name");
  });

  it("rejects empty description", async () => {
    const tool = createCreateSkillTool();
    await expect(
      tool.execute({ name: "test", description: "", instructions: "instr" }),
    ).rejects.toThrow("description");
  });

  it("rejects empty instructions", async () => {
    const tool = createCreateSkillTool();
    await expect(
      tool.execute({ name: "test", description: "desc", instructions: "" }),
    ).rejects.toThrow("instructions");
  });
});
