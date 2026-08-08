import { describe, expect, it } from "vitest";
import { ToolRegistry as InMemoryToolRegistry } from "../src/tool/registry.js";
import type { ToolDefinition } from "../src/tool/definitions.js";

function makeTool(id: string, risk: "read" | "write" = "read"): ToolDefinition {
  return {
    id,
    description: `Tool ${id}`,
    risk,
    async execute() { return "ok"; },
  };
}

describe("InMemoryToolRegistry", () => {
  it("register and get a tool", () => {
    const reg = new InMemoryToolRegistry();
    reg.register(makeTool("read_file"));
    expect(reg.get("read_file")).toBeDefined();
  });

  it("unregister removes a tool", () => {
    const reg = new InMemoryToolRegistry();
    reg.register(makeTool("test"));
    expect(reg.unregister("test")).toBe(true);
    expect(reg.get("test")).toBeUndefined();
  });

  it("unregister returns false for unknown tool", () => {
    const reg = new InMemoryToolRegistry();
    expect(reg.unregister("unknown")).toBe(false);
  });

  it("list returns all tools", () => {
    const reg = new InMemoryToolRegistry();
    reg.register(makeTool("a"));
    reg.register(makeTool("b"));
    expect(reg.list()).toHaveLength(2);
  });

  it("list filters by risk", () => {
    const reg = new InMemoryToolRegistry();
    reg.register(makeTool("read_a", "read"));
    reg.register(makeTool("write_b", "write"));
    const reads = reg.list({ risk: "read" });
    expect(reads).toHaveLength(1);
    expect(reads[0]!.id).toBe("read_a");
  });

  it("list filters by pattern", () => {
    const reg = new InMemoryToolRegistry();
    reg.register(makeTool("read_file"));
    reg.register(makeTool("write_file"));
    reg.register(makeTool("search_code"));
    const readTools = reg.list({ pattern: "read_*" });
    expect(readTools).toHaveLength(1);
    expect(readTools[0]!.id).toBe("read_file");
  });

  it("count returns correct number", () => {
    const reg = new InMemoryToolRegistry();
    expect(reg.count()).toBe(0);
    reg.register(makeTool("a"));
    reg.register(makeTool("b"));
    expect(reg.count()).toBe(2);
  });

  it("getOrThrow throws ToolNotFoundError", () => {
    const reg = new InMemoryToolRegistry();
    expect(() => reg.getOrThrow("nonexistent")).toThrow("Tool not found");
  });

  it("getOrThrow returns tool when found", () => {
    const reg = new InMemoryToolRegistry();
    reg.register(makeTool("exists"));
    expect(reg.getOrThrow("exists").id).toBe("exists");
  });
});
