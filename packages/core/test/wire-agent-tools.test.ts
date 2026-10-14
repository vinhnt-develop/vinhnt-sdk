import { describe, expect, it } from "vitest";
import { ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { SkillDefinition } from "@vinhnt-sdk/schema";
import type { ToolContext } from "@vinhnt-sdk/tools";
import { AgentKernel, createToolProviderRegistry, wireAgentAndSkillTools, InMemorySkillDefRegistry } from "../src/index.js";
import { SkillParser } from "../src/skill/skill-parser.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";

const testSkill = {
  manifest: { name: "testing", description: "Testing best practices for the project" },
  body: "Write tests first.",
} as unknown as SkillDefinition;

function makeToolCtx(): ToolContext {
  return {
    sessionId: "",
    runId: "",
    agentId: "",
    agentName: "",
    signal: new AbortController().signal,
    env: {},
    ask: async () => "reject",
    metadata: () => {},
    setCompensation: () => {},
  };
}

function makeKernel(): AgentKernel {
  return new AgentKernel({
    model: new FakeModelProvider([]),
    store: new FakeRunEventStore(),
    maxSteps: 1,
  });
}

describe("P2.6 wireAgentAndSkillTools", () => {
  it("TC01_registers_all_agent_and_skill_tools", () => {
    const registry = new ToolProviderRegistry();
    const wired = wireAgentAndSkillTools(makeKernel(), registry);

    const ids = registry.getAllTools().map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "spawn_agent",
        "delegate",
        "create_agent",
        "list_agents",
        "skill",
        "skill_search",
      ]),
    );
    // Returned handle is the ONLY way to populate skills — must be a real,
    // empty, usable registry (the old stub kept it private and parser-less).
    expect(wired.skillRegistry.list()).toEqual([]);
  });

  it("TC02_injected_skill_registry_is_used_by_the_wired_skill_tools", async () => {
    const registry = new ToolProviderRegistry();
    const custom = new InMemorySkillDefRegistry(new SkillParser());
    const wired = wireAgentAndSkillTools(makeKernel(), registry, { skillRegistry: custom });
    expect(wired.skillRegistry).toBe(custom);

    await custom.load([testSkill]);

    const searchTool = registry.getAllTools().find((t) => t.id === "skill_search")!;
    const output = await searchTool.execute({ query: "testing" }, makeToolCtx());
    expect(output).toContain("testing");
    expect(output).toContain("Testing best practices");
  });

  it("TC03_default_registry_populates_via_returned_handle", async () => {
    const registry = new ToolProviderRegistry();
    const wired = wireAgentAndSkillTools(makeKernel(), registry);

    await wired.skillRegistry.load([testSkill]);

    const skillTool = registry.getAllTools().find((t) => t.id === "skill")!;
    const output = await skillTool.execute({ name: "testing", task: "write unit tests" }, makeToolCtx());
    expect(output).toContain("# Skill: testing");
    expect(output).toContain("write unit tests");
  });

  it("TC04_createToolProviderRegistry_builds_builtin_tool_pool", async () => {
    const registry = await createToolProviderRegistry({
      workspaceRoot: process.cwd(),
      shell: { workspaceRoot: process.cwd(), defaultTimeoutMs: 30_000 },
    });
    expect(registry.getAllTools().length).toBeGreaterThan(0);
  });
});
