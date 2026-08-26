import { describe, it, expect } from "vitest";
import { createSkillTool, createSkillSearchTool } from "../src/skill/skill-tool.js";
import type { SkillDefRegistry } from "../src/skill/skill-def-registry.js";
import type { SkillDefinition } from "@vinhnt-sdk/schema";

function mockSkill(name: string, description: string, tools?: string[]): SkillDefinition {
  return {
    manifest: { name, description, ...(tools !== undefined ? { tools } : {}) },
    body: `Instructions for ${name}`,
    raw: `Instructions for ${name}`,
    source: { type: "project", dir: `/skills/${name}`, priority: 10 },
  };
}

function mockRegistry(entries: SkillDefinition[]): SkillDefRegistry {
  const map = new Map(entries.map((s) => [s.manifest.name, s]));
  return {
    get: (name: string) => map.get(name),
    search: (query: string) =>
      entries.filter(
        (s) =>
          s.manifest.name.toLowerCase().includes(query.toLowerCase()) ||
          s.manifest.description.toLowerCase().includes(query.toLowerCase()),
      ),
    load: async () => {},
    list: () => entries,
    reload: async () => {},
  };
}

describe("createSkillTool", () => {
  it("returns a tool with correct id and risk", () => {
    const tool = createSkillTool(mockRegistry([]));
    expect(tool.id).toBe("skill");
    expect(tool.risk).toBe("read");
  });

  it("loads skill and formats output", async () => {
    const skill = mockSkill("code-review", "Review code quality");
    const tool = createSkillTool(mockRegistry([skill]));
    const result = await tool.execute({ name: "code-review", task: "review PR #42" }, {} as never);
    expect(result).toContain("Skill: code-review");
    expect(result).toContain("Review code quality");
    expect(result).toContain("Instructions for code-review");
    expect(result).toContain("review PR #42");
  });

  it("shows similar skills when exact name not found", async () => {
    const s1 = mockSkill("code-review", "Review code quality");
    const s2 = mockSkill("deploy", "Deploy to production");
    const tool = createSkillTool(mockRegistry([s1, s2]));
    const result = await tool.execute({ name: "review", task: "check code" }, {} as never);
    expect(result).toContain('Skill "review" not found');
    expect(result).toContain("Available similar skills");
    expect(result).toContain("code-review");
  });

  it("returns not found message when no similar skills", async () => {
    const tool = createSkillTool(mockRegistry([]));
    const result = await tool.execute({ name: "nonexistent", task: "test" }, {} as never);
    expect(result).toBe('Skill "nonexistent" not found. No similar skills found.');
  });

  it("includes tools in formatted output when skill has tools", async () => {
    const skill = mockSkill("test", "Run tests", ["read_file", "execute_command"]);
    const tool = createSkillTool(mockRegistry([skill]));
    const result = await tool.execute({ name: "test", task: "run tests" }, {} as never);
    expect(result).toContain("read_file");
    expect(result).toContain("execute_command");
  });

  it("rejects empty name", async () => {
    const tool = createSkillTool(mockRegistry([]));
    await expect(tool.execute({ name: "", task: "test" }, {} as never)).rejects.toThrow("name");
  });

  it("rejects empty task", async () => {
    const tool = createSkillTool(mockRegistry([]));
    await expect(tool.execute({ name: "test", task: "" }, {} as never)).rejects.toThrow("task");
  });
});

describe("createSkillSearchTool", () => {
  it("returns a tool with correct id and risk", () => {
    const tool = createSkillSearchTool(mockRegistry([]));
    expect(tool.id).toBe("skill_search");
    expect(tool.risk).toBe("read");
  });

  it("returns matching skills", async () => {
    const skills = [
      mockSkill("code-review", "Review code quality"),
      mockSkill("deploy", "Deploy to production"),
      mockSkill("testing", "Run tests"),
    ];
    const tool = createSkillSearchTool(mockRegistry(skills));
    const result = await tool.execute({ query: "deploy" }, {} as never);
    expect(result).toContain("Found 1 skill(s)");
    expect(result).toContain("deploy");
  });

  it("returns multiple matches", async () => {
    const skills = [
      mockSkill("deploy-prod", "Production deploy"),
      mockSkill("deploy-staging", "Staging deploy"),
    ];
    const tool = createSkillSearchTool(mockRegistry(skills));
    const result = await tool.execute({ query: "deploy" }, {} as never);
    expect(result).toContain("Found 2 skill(s)");
  });

  it("returns empty message when no matches", async () => {
    const tool = createSkillSearchTool(mockRegistry([]));
    const result = await tool.execute({ query: "nonexistent" }, {} as never);
    expect(result).toBe('No skills found matching "nonexistent".');
  });

  it("shows tools tag when skill has tools", async () => {
    const skill = mockSkill("test", "Test runner", ["execute_command"]);
    const tool = createSkillSearchTool(mockRegistry([skill]));
    const result = await tool.execute({ query: "test" }, {} as never);
    expect(result).toContain("[tools: execute_command]");
  });

  it("rejects empty query", async () => {
    const tool = createSkillSearchTool(mockRegistry([]));
    await expect(tool.execute({ query: "" }, {} as never)).rejects.toThrow("query");
  });
});
