import { describe, it, expect } from "vitest";
import { AgentParser } from "../src/agent/agent-parser.js";
import type { SkillSource } from "@vinhnt-sdk/schema";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const parser = new AgentParser();
const defaultSource: SkillSource = { type: "project", dir: ".", priority: 0 };

describe("AgentParser", () => {
  it("parses minimal YAML frontmatter with name and description", () => {
    const raw = `---\nname: test-agent\ndescription: A test agent\n---\n`;
    const def = parser.parse(raw, defaultSource);
    expect(def.config.id).toBe("test-agent");
    expect(def.config.profile.name).toBe("test-agent");
    expect(def.config.profile.description).toBe("A test agent");
    expect(def.config.permissions?.mode).toBe("all");
  });

  it("parses full YAML frontmatter with all fields", () => {
    const raw = [
      "---",
      "name: my-agent",
      "description: A test agent",
      "mode: subagent",
      "model: gpt-4o",
      "hidden: true",
      "maxSteps: 25",
      "temperature: 0.7",
      "permission:",
      "  read: allow",
      "  edit-star: deny",
      "---",
      "You are a helpful agent.",
    ].join("\n");
    const def = parser.parse(raw, defaultSource);
    expect(def.config.id).toBe("my-agent");
    expect(def.config.profile.name).toBe("my-agent");
    expect(def.config.profile.description).toBe("A test agent");
    expect(def.config.profile.model).toBe("gpt-4o");
    expect(def.config.profile.hidden).toBe(true);
    expect(def.config.permissions?.mode).toBe("subagent");
    expect(def.config.systemPrompt).toBe("You are a helpful agent.");
    expect(def.config.temperature).toBe(0.7);
  });

  it("parses permission as flat string values into rules", () => {
    const raw = `---\nname: perm-agent\ndescription: perm test\npermission:\n  read: allow\n  write: deny\n---\n`;
    const def = parser.parse(raw, defaultSource);
    const rules = def.config.permissions?.ruleset?.rules ?? [];
    expect(rules).toContainEqual({ effect: "allow", target: "read" });
    expect(rules).toContainEqual({ effect: "deny", target: "write" });
  });

  it("parses nested permission patterns", () => {
    const raw = [
      "---",
      "name: nested-perm",
      "description: nested",
      "permission:",
      "  bash:",
      "    git: allow",
      "    rm: deny",
      "  edit:",
      "    all: allow",
      "---",
    ].join("\n");
    const def = parser.parse(raw, defaultSource);
    const rules = def.config.permissions?.ruleset?.rules ?? [];
    expect(rules).toContainEqual({ effect: "allow", target: "bash.git" });
    expect(rules).toContainEqual({ effect: "deny", target: "bash.rm" });
    expect(rules).toContainEqual({ effect: "allow", target: "edit.all" });
  });

  it("defaults to 'unnamed' when name is missing", () => {
    const raw = `---\ndescription: no name\n---\n`;
    const def = parser.parse(raw, defaultSource);
    expect(def.config.profile.name).toBe("unnamed");
    expect(def.config.id).toBeTruthy();
  });

  it("parseFile reads and parses a file with frontmatter", async () => {
    const tmpDir = mkdtempSync("agent-parser-");
    const filePath = join(tmpDir, "test-agent.md");
    const content = `---\nname: file-agent\ndescription: from file\n---\n`;
    writeFileSync(filePath, content, "utf-8");
    try {
      const def = await parser.parseFile(filePath, defaultSource);
      expect(def.config.profile.name).toBe("file-agent");
      expect(def.config.profile.description).toBe("from file");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("toAgentConfig returns config from definition", () => {
    const raw = `---\nname: cfg-test\ndescription: config\n---\n`;
    const def = parser.parse(raw, defaultSource);
    const config = parser.toAgentConfig(def);
    expect(config).toBe(def.config);
  });

  it("handles permission with maxSteps in ruleset", () => {
    const raw = `---\nname: step-agent\ndescription: steps\nmaxSteps: 15\npermission:\n  read: allow\n---\n`;
    const def = parser.parse(raw, defaultSource);
    expect(def.config.permissions?.ruleset?.maxSteps).toBe(15);
    expect(def.config.permissions?.ruleset?.rules).toHaveLength(1);
  });

  it("sets mode from frontmatter", () => {
    const raw = `---\nname: mode-agent\ndescription: mode test\nmode: primary\n---\n`;
    const def = parser.parse(raw, defaultSource);
    expect(def.config.permissions?.mode).toBe("primary");
  });

  it("uses default mode 'all' when not specified", () => {
    const raw = `---\nname: default-agent\ndescription: default mode\n---\n`;
    const def = parser.parse(raw, defaultSource);
    expect(def.config.permissions?.mode).toBe("all");
  });

  it("configures model from frontmatter", () => {
    const raw = `---\nname: model-agent\ndescription: has model\nmodel: claude-3-5-sonnet\n---\n`;
    const def = parser.parse(raw, defaultSource);
    expect(def.config.profile.model).toBe("claude-3-5-sonnet");
  });

  it("handles 'hidden: true' from frontmatter", () => {
    const raw = `---\nname: hidden-agent\ndescription: hidden\nhidden: true\n---\n`;
    const def = parser.parse(raw, defaultSource);
    expect(def.config.profile.hidden).toBe(true);
  });
});
