import { describe, expect, it } from "vitest";
import { ToolRegistry } from "../src/registry.js";
import { ToolNotFoundError } from "@vinhnt-sdk/schema";
import type { ToolDefinition } from "../src/definitions.js";

function makeTool(id: string): ToolDefinition {
  return {
    id,
    description: `${id} tool`,
    risk: "low",
    async execute(args) { return { ok: true, result: `${id}:${JSON.stringify(args)}` }; },
  };
}

describe("ToolRegistry.materialize (RV-25)", () => {
  it("settle allows an allowed tool", async () => {
    const reg = new ToolRegistry();
    reg.register(makeTool("read_file"));
    const materialized = reg.materialize();
    await expect(materialized.settle({ name: "read_file", args: { path: "/x" } })).resolves.toEqual({
      ok: true,
      result: "read_file:{\"path\":\"/x\"}",
    });
  });

  it("settle throws ToolNotFoundError for a tool filtered out by a deny rule", async () => {
    const reg = new ToolRegistry();
    reg.register(makeTool("read_file"));
    reg.register(makeTool("write_file"));
    const materialized = reg.materialize([{ action: "write_file", effect: "deny" }]);

    expect(materialized.definitions.map((d) => d.id)).toEqual(["read_file"]);
    expect(materialized.denied.map((d) => d.id)).toEqual(["write_file"]);

    // settle must NOT bypass the deny filter.
    await expect(materialized.settle({ name: "write_file", args: {} })).rejects.toBeInstanceOf(ToolNotFoundError);
  });

  it("settle throws ToolNotFoundError for a wildcard-denied tool", async () => {
    const reg = new ToolRegistry();
    reg.register(makeTool("file_edit"));
    reg.register(makeTool("file_read"));
    const materialized = reg.materialize([{ action: "file_*", effect: "deny" }]);

    expect(materialized.definitions.map((d) => d.id)).toEqual([]);
    await expect(materialized.settle({ name: "file_edit", args: {} })).rejects.toBeInstanceOf(ToolNotFoundError);
  });

  it("settle rejects an unknown tool", async () => {
    const reg = new ToolRegistry();
    reg.register(makeTool("known"));
    const materialized = reg.materialize();
    await expect(materialized.settle({ name: "unknown", args: {} })).rejects.toBeInstanceOf(ToolNotFoundError);
  });
});