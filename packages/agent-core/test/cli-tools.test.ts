import { describe, expect, it } from "vitest";
import { ToolProviderRegistry } from "@vinhnt-sdk/agent-core";
import { BuiltinToolProvider } from "@vinhnt-sdk/agent-core/tool/providers/builtin-provider";

function createBuiltinProvider(): BuiltinToolProvider {
  return new BuiltinToolProvider({
    workspaceRoot: process.cwd(),
    shell: {},
  });
}

describe("ToolProviderRegistry CLI integration", () => {
  it("can list built-in tools", () => {
    const registry = new ToolProviderRegistry();
    const builtin = createBuiltinProvider();
    registry.registerProvider(builtin);

    expect(registry.count()).toBeGreaterThan(0);
    expect(registry.listProviders()).toHaveLength(1);
    expect(registry.listProviders()[0]?.id).toBe("builtin");
  });

  it("can search tools by ID", () => {
    const registry = new ToolProviderRegistry();
    const builtin = createBuiltinProvider();
    registry.registerProvider(builtin);

    const allTools = registry.getAllTools();
    const readTool = allTools.find((t) => t.id === "read_file");
    expect(readTool).toBeDefined();
    expect(readTool?.risk).toBe("read");
  });

  it("has correct tool count", () => {
    const builtin = createBuiltinProvider();
    expect(builtin.tools.length).toBeGreaterThanOrEqual(10);
  });

  it("ToolProviderRegistry supports multiple providers", () => {
    const registry = new ToolProviderRegistry();
    const builtin = createBuiltinProvider();
    registry.registerProvider(builtin);

    registry.registerProvider({
      id: "mock",
      name: "Mock Provider",
      tools: [{
        id: "mock-tool",
        description: "A mock tool",
        risk: "read" as const,
        async execute() { return "mock"; },
      }],
      register() {},
    });

    expect(registry.count()).toBe(builtin.tools.length + 1);
    expect(registry.hasTool("mock-tool")).toBe(true);
  });

  it("ToolProviderRegistry unregister removes provider tools", () => {
    const registry = new ToolProviderRegistry();
    const builtin = createBuiltinProvider();
    registry.registerProvider(builtin);

    registry.registerProvider({
      id: "temp",
      name: "Temporary",
      tools: [{
        id: "temp-tool",
        description: "Temporary tool",
        risk: "read" as const,
        async execute() { return "temp"; },
      }],
      register() {},
    });

    expect(registry.hasTool("temp-tool")).toBe(true);
    registry.unregisterProvider("temp");
    expect(registry.hasTool("temp-tool")).toBe(false);
  });
});
