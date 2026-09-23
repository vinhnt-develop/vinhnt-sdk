import { describe, expect, it, vi } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { defineTool } from "../src/index.js";
import type { ToolDefinition } from "@vinhnt-sdk/core";
import { z } from "zod";

function createMockTool(id: string, risk: "read" | "write" | "destructive" | "external" = "read"): ToolDefinition {
  return defineTool({
    name: id,
    description: `Mock tool ${id}`,
    risk,
    input: z.object({}),
    async execute() {
      return `result from ${id}`;
    },
  }).toDefinition();
}

function createMockModel() {
  return {
    model: "test-model",
    generate: vi.fn().mockResolvedValue({ content: "test", usage: { input: 0, output: 0 } }),
    stream: vi.fn().mockImplementation(async function* () {
      yield { type: "text" as const, text: "test" };
    }),
  };
}

function createMockStore() {
  return {
    append: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    saveSnapshot: vi.fn().mockResolvedValue(undefined),
    getSnapshot: vi.fn().mockResolvedValue(null),
    exists: vi.fn().mockResolvedValue(false),
  };
}

function getAvailable(kernel: AgentKernel): readonly ToolDefinition[] {
  return (kernel as unknown as { getAvailableTools(): readonly ToolDefinition[] }).getAvailableTools();
}

describe("P1-5 tools[] snapshot filtering", () => {
  it("hides bare-name deny tool from tools[] by default", () => {
    const tools = [createMockTool("delete_file", "destructive"), createMockTool("read_file")];
    const kernel = new AgentKernel({
      model: createMockModel() as never,
      store: createMockStore() as never,
      tools,
      permissions: {
        globalPermissionRules: { delete_file: "deny" },
      },
    });

    const available = getAvailable(kernel);
    expect(available.map((t) => t.id)).toEqual(["read_file"]);
  });

  it("keeps bare-name deny tool visible when bareDenyHidesTool=false", () => {
    const tools = [createMockTool("delete_file", "destructive"), createMockTool("read_file")];
    const kernel = new AgentKernel({
      model: createMockModel() as never,
      store: createMockStore() as never,
      tools,
      permissions: {
        globalPermissionRules: { delete_file: "deny" },
        bareDenyHidesTool: false,
      },
    });

    const available = getAvailable(kernel);
    expect(available.map((t) => t.id)).toContain("delete_file");
  });

  it("hides tools matching hideFromModel globs even when allowed", () => {
    const tools = [createMockTool("web_search", "external"), createMockTool("read_file")];
    const kernel = new AgentKernel({
      model: createMockModel() as never,
      store: createMockStore() as never,
      tools,
      permissions: {
        hideFromModel: ["web_*"],
      },
    });

    const available = getAvailable(kernel);
    expect(available.map((t) => t.id)).toEqual(["read_file"]);
  });

  it("keeps pattern-scoped allow tools visible", () => {
    const tools = [createMockTool("shell", "write"), createMockTool("read_file")];
    const kernel = new AgentKernel({
      model: createMockModel() as never,
      store: createMockStore() as never,
      tools,
      permissions: {
        topLevelPermissionRules: {
          allow: ["shell(git *)"],
          deny: [],
          ask: [],
        },
      },
    });

    // Pattern-scoped allow still allows at snapshot (no args → extractContextPattern *)
    const available = getAvailable(kernel);
    expect(available.map((t) => t.id)).toContain("shell");
  });

  it("hides tool denied via topLevelPermissionRules bare pattern", () => {
    const tools = [createMockTool("execute_command", "destructive"), createMockTool("read_file")];
    const kernel = new AgentKernel({
      model: createMockModel() as never,
      store: createMockStore() as never,
      tools,
      permissions: {
        topLevelPermissionRules: {
          allow: [],
          deny: ["execute_command"],
          ask: [],
        },
      },
    });

    const available = getAvailable(kernel);
    expect(available.map((t) => t.id)).toEqual(["read_file"]);
  });
});
