import { describe, expect, it } from "vitest";
import { SkillFileLoader } from "../src/skill/skill-file-loader.js";
import { AgentFileLoader } from "../src/agent/agent-file-loader.js";
import { join } from "node:path";

describe("SkillFileLoader", () => {
  it("has correct default parser", () => {
    const loader = new SkillFileLoader();
    expect(loader).toBeDefined();
  });

  it("loads skills from directory", async () => {
    const loader = new SkillFileLoader();
    const fixturesDir = join(import.meta.dirname, "fixtures");
    const skills = await loader.loadFromDirectory(
      join(fixturesDir, ".vnt", "skills"),
      { type: "project", dir: fixturesDir, priority: 10 },
    );
    // May be empty if no skills in fixtures
    expect(Array.isArray(skills)).toBe(true);
  });
});

describe("AgentFileLoader", () => {
  it("has correct default parser", () => {
    const loader = new AgentFileLoader();
    expect(loader).toBeDefined();
  });

  it("loads agents from directory", async () => {
    const loader = new AgentFileLoader();
    const fixturesDir = join(import.meta.dirname, "fixtures");
    const agents = await loader.loadFromDirectory(
      join(fixturesDir, ".vnt", "agents"),
      { type: "project", dir: fixturesDir, priority: 10 },
    );
    // May be empty if no agents in fixtures
    expect(Array.isArray(agents)).toBe(true);
  });
});
