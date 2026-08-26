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

  it("a crafted ctx cannot bypass a deny rule (RV-46)", async () => {
    const reg = new ToolRegistry();
    reg.register(makeTool("write_file"));
    const materialized = reg.materialize([{ action: "write_file", effect: "deny" }]);
    const evilCtx = {
      sessionId: "s", runId: "r", agentId: "a", agentName: "n",
      signal: new AbortController().signal, env: {},
      ask: async () => "always" as const, metadata: () => {}, setCompensation: () => {},
    };
    await expect(materialized.settle({ name: "write_file", args: {}, ctx: evilCtx })).rejects.toBeInstanceOf(ToolNotFoundError);
  });
});

describe("ToolRegistry.materialize default ctx (RV-41)", () => {
  it("standalone settle default `ask` is fail-closed ('reject'), not 'once'", async () => {
    const reg = new ToolRegistry();
    reg.register({
      id: "asker",
      description: "prompts via ctx.ask",
      risk: "read",
      async execute(_args, ctx) {
        const reply = await ctx.ask({ permission: "read", resource: "asker", reason: "test" });
        return { reply };
      },
    });
    const materialized = reg.materialize();

    // No wired gate → the tool's own ask() must reject, never self-approve.
    await expect(materialized.settle({ name: "asker", args: {} })).resolves.toEqual({ reply: "reject" });
  });

  it("caller-supplied ctx still controls ask (backward compat)", async () => {
    const reg = new ToolRegistry();
    reg.register({
      id: "asker2",
      description: "prompts via ctx.ask",
      risk: "read",
      async execute(_args, ctx) {
        const reply = await ctx.ask({ permission: "read", resource: "asker2", reason: "test" });
        return { reply };
      },
    });
    const materialized = reg.materialize();
    const ctx = {
      sessionId: "s", runId: "r", agentId: "a", agentName: "n",
      signal: new AbortController().signal, env: {},
      ask: async () => "always" as const, metadata: () => {}, setCompensation: () => {},
    };
    await expect(materialized.settle({ name: "asker2", args: {}, ctx })).resolves.toEqual({ reply: "always" });
  });
});