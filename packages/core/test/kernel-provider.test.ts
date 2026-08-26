import { describe, expect, it, vi } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { ToolProviderRegistry, BuiltinToolProvider } from "@vinhnt-sdk/core";
import type { ToolDefinition } from "@vinhnt-sdk/core";
import { defineTool } from "@vinhnt-sdk/core";
import { z } from "zod";

function createMockTool(id: string): ToolDefinition {
  return defineTool({
    name: id,
    description: `Mock tool ${id}`,
    risk: "read" as const,
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

describe("AgentKernel with ToolProviderRegistry", () => {
  it("uses toolProviderRegistry when provided", () => {
    const registry = new ToolProviderRegistry();
    const tool = createMockTool("test-tool");
    registry.registerProvider({
      id: "test",
      name: "Test Provider",
      tools: [tool],
      register: () => {},
    });

    const kernel = new AgentKernel({
      model: createMockModel() as never,
      store: createMockStore() as never,
      toolProviderRegistry: registry,
    });

    // Access private method via bracket notation for testing
    const availableTools = (kernel as unknown as { getAvailableTools(): readonly ToolDefinition[] }).getAvailableTools();
    expect(availableTools).toContainEqual(tool);
  });

  it("falls back to tools[] when no toolProviderRegistry", () => {
    const tool = createMockTool("legacy-tool");

    const kernel = new AgentKernel({
      model: createMockModel() as never,
      store: createMockStore() as never,
      tools: [tool],
    });

    const availableTools = (kernel as unknown as { getAvailableTools(): readonly ToolDefinition[] }).getAvailableTools();
    expect(availableTools).toContainEqual(tool);
  });

  it("hasTool checks toolProviderRegistry", () => {
    const registry = new ToolProviderRegistry();
    const tool = createMockTool("test-tool");
    registry.registerProvider({
      id: "test",
      name: "Test Provider",
      tools: [tool],
      register: () => {},
    });

    const kernel = new AgentKernel({
      model: createMockModel() as never,
      store: createMockStore() as never,
      toolProviderRegistry: registry,
    });

    const hasTool = (kernel as unknown as { hasTool(name: string): boolean }).hasTool("test-tool");
    expect(hasTool).toBe(true);

    const hasMissing = (kernel as unknown as { hasTool(name: string): boolean }).hasTool("missing-tool");
    expect(hasMissing).toBe(false);
  });

  it("builtin tools are available via toolProviderRegistry", () => {
    const registry = new ToolProviderRegistry();
    const builtinProvider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
    });
    registry.registerProvider(builtinProvider);

    const kernel = new AgentKernel({
      model: createMockModel() as never,
      store: createMockStore() as never,
      toolProviderRegistry: registry,
    });

    const availableTools = (kernel as unknown as { getAvailableTools(): readonly ToolDefinition[] }).getAvailableTools();
    const toolIds = availableTools.map((t) => t.id);

    expect(toolIds).toContain("read_file");
    expect(toolIds).toContain("write_file");
    expect(toolIds).toContain("execute_command");
    expect(toolIds).toContain("glob_files");
    expect(toolIds).toContain("git_status");
  });

  it("user tools override builtin tools", () => {
    const registry = new ToolProviderRegistry();

    // Register builtin first
    const builtinProvider = new BuiltinToolProvider({
      workspaceRoot: "/tmp",
      shell: { workspaceRoot: "/tmp", defaultTimeoutMs: 5000 },
    });
    registry.registerProvider(builtinProvider);

    // Register user tool with same ID (overrides builtin)
    const userTool = createMockTool("read_file");
    registry.registerProvider({
      id: "user",
      name: "User Tools",
      tools: [userTool],
      register: () => {},
    });

    const kernel = new AgentKernel({
      model: createMockModel() as never,
      store: createMockStore() as never,
      toolProviderRegistry: registry,
    });

    const availableTools = (kernel as unknown as { getAvailableTools(): readonly ToolDefinition[] }).getAvailableTools();
    const readFileTool = availableTools.find((t) => t.id === "read_file");

    // Should be the user tool, not the builtin
    expect(readFileTool).toBe(userTool);
  });
});
