import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  defineTool,
  toolToDefinition,
  zodSchemaToNestedJsonSchema,
} from "@vinhnt-sdk/tools";
import { ToolRegistry } from "@vinhnt-sdk/tools";
import type { ToolDefinition } from "@vinhnt-sdk/tools";

const noopCtx = {
  sessionId: "",
  runId: "",
  agentId: "",
  agentName: "",
  signal: new AbortController().signal,
  env: {},
  ask: async () => "once" as const,
  metadata: () => {},
  setCompensation: () => {},
};

describe("zodSchemaToNestedJsonSchema", () => {
  it("maps primitives", () => {
    expect(zodSchemaToNestedJsonSchema(z.string())).toEqual({ type: "string" });
    expect(zodSchemaToNestedJsonSchema(z.number())).toEqual({ type: "number" });
    expect(zodSchemaToNestedJsonSchema(z.boolean())).toEqual({ type: "boolean" });
  });

  it("maps enums to string enum", () => {
    expect(zodSchemaToNestedJsonSchema(z.enum(["read", "write"]))).toEqual({
      type: "string",
      enum: ["read", "write"],
    });
  });

  it("unwraps optional and default wrappers", () => {
    expect(zodSchemaToNestedJsonSchema(z.string().optional())).toEqual({ type: "string" });
    expect(zodSchemaToNestedJsonSchema(z.string().default("x"))).toEqual({ type: "string" });
  });

  it("maps objects with required computation", () => {
    const schema = z.object({
      path: z.string(),
      depth: z.number().optional(),
      append: z.boolean().default(false),
    });
    expect(zodSchemaToNestedJsonSchema(schema)).toEqual({
      type: "object",
      properties: {
        path: { type: "string" },
        depth: { type: "number" },
        append: { type: "boolean" },
      },
      required: ["path"],
    });
  });

  it("maps arrays with item schema", () => {
    expect(zodSchemaToNestedJsonSchema(z.array(z.string()))).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  it("unwraps refine/transform effects", () => {
    expect(zodSchemaToNestedJsonSchema(z.string().min(1).refine(() => true))).toEqual({
      type: "string",
    });
  });

  it("carries schema descriptions", () => {
    expect(zodSchemaToNestedJsonSchema(z.string().describe("a path"))).toEqual({
      type: "string",
      description: "a path",
    });
  });

  it("returns undefined for null schema", () => {
    expect(zodSchemaToNestedJsonSchema(undefined as never)).toBeUndefined();
  });
});

describe("defineTool", () => {
  it("derives provider-facing definition from the owned schema", () => {
    const tool = defineTool({
      name: "coding.read_file",
      description: "Read a file",
      risk: "read",
      input: z.object({ path: z.string() }),
      async execute(input) {
        return `read ${input.path}`;
      },
    });
    const def = tool.toDefinition();
    expect(def.id).toBe("coding.read_file");
    expect(def.description).toBe("Read a file");
    expect(def.risk).toBe("read");
    expect(def.inputSchema).toEqual({
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    });
  });

  it("allows an explicit jsonSchema override", () => {
    const tool = defineTool({
      name: "write_file",
      description: "Write a file",
      risk: "write",
      input: z.object({ path: z.string() }),
      jsonSchema: { type: "object", properties: { path: { type: "string" } } },
      async execute() {
        return "ok";
      },
    });
    expect(tool.toDefinition().inputSchema).toEqual({
      type: "object",
      properties: { path: { type: "string" } },
    });
  });

  it("validates input at execution time", async () => {
    const tool = defineTool({
      name: "read_file",
      description: "Read a file",
      risk: "read",
      input: z.object({ path: z.string() }),
      async execute(input) {
        return input.path;
      },
    });
    const def = tool.toDefinition();
    await expect(def.execute({ path: "/tmp/a.txt" }, noopCtx)).resolves.toBe("/tmp/a.txt");
    await expect(def.execute({}, noopCtx)).rejects.toThrow('Tool read_file input error: path');
  });

  it("runs normalize before validation", async () => {
    const tool = defineTool({
      name: "read_file",
      description: "Read a file",
      risk: "read",
      input: z.object({ path: z.string() }),
      normalize(raw) {
        const r = raw as { file_path?: string };
        return r.file_path ? { path: r.file_path } : raw;
      },
      async execute(input) {
        return input.path;
      },
    });
    const def = tool.toDefinition();
    await expect(def.execute({ file_path: "/x" }, noopCtx)).resolves.toBe("/x");
  });

  it("validates output schema when provided", async () => {
    const tool = defineTool({
      name: "echo",
      description: "Echo",
      risk: "read",
      input: z.object({ value: z.string() }),
      output: z.object({ value: z.string() }),
      async execute(input) {
        return { value: input.value };
      },
    });
    const def = tool.toDefinition();
    await expect(def.execute({ value: "hi" }, noopCtx)).resolves.toEqual({ value: "hi" });
  });

  it("exposes config on the tool handle", () => {
    const tool = defineTool({
      name: "my_tool",
      description: "desc",
      risk: "write",
      timeoutMs: 5000,
      permissionAction: "edit",
      input: z.object({}),
      async execute() {
        return null;
      },
    });
    expect(tool.name).toBe("my_tool");
    expect(tool.risk).toBe("write");
    expect(tool.timeoutMs).toBe(5000);
    expect(tool.permissionAction).toBe("edit");
  });

  it("carries inputZodSchema on definition", () => {
    const inputSchema = z.object({ path: z.string() });
    const tool = defineTool({
      name: "read_file",
      description: "Read a file",
      risk: "read",
      input: inputSchema,
      async execute(input) { return input.path; },
    });
    const def = tool.toDefinition();
    expect(def.inputZodSchema).toBe(inputSchema);
    expect(def.inputZodSchema).toBeTruthy();
  });

  it("carries outputZodSchema on definition when provided", () => {
    const outputSchema = z.object({ content: z.string() });
    const tool = defineTool({
      name: "read_file",
      description: "Read a file",
      risk: "read",
      input: z.object({ path: z.string() }),
      output: outputSchema,
      async execute(input) { return { content: `file: ${input.path}` }; },
    });
    const def = tool.toDefinition();
    expect(def.outputZodSchema).toBe(outputSchema);
  });

  it("outputZodSchema is undefined when not provided", () => {
    const tool = defineTool({
      name: "echo",
      description: "Echo",
      risk: "read",
      input: z.object({ text: z.string() }),
      async execute(input) { return input.text; },
    });
    const def = tool.toDefinition();
    expect(def.outputZodSchema).toBeUndefined();
  });

  it("carries permissionAction on definition", () => {
    const tool = defineTool({
      name: "shell_exec",
      description: "Run shell",
      risk: "write",
      permissionAction: "shell",
      input: z.object({ command: z.string() }),
      async execute() { return "ok"; },
    });
    const def = tool.toDefinition();
    expect(def.permissionAction).toBe("shell");
  });
});

describe("toolToDefinition", () => {
  it("builds a ToolDefinition directly", () => {
    const def = toolToDefinition({
      name: "build",
      description: "Build",
      risk: "write",
      input: z.object({ target: z.string() }),
      async execute(input) {
        return input.target;
      },
    });
    expect(def.id).toBe("build");
    expect((def as ToolDefinition).risk).toBe("write");
  });
});

describe("ToolRegistry.materialize / settle", () => {
  function makeDefinition(id: string, risk: "read" | "write" = "read"): ToolDefinition {
    return {
      id,
      description: `Tool ${id}`,
      risk,
      async execute() {
        return "ok";
      },
    };
  }

  it("materializes all tools by default", () => {
    const reg = new ToolRegistry();
    reg.register(makeDefinition("read_file"));
    reg.register(makeDefinition("write_file", "write"));
    const m = reg.materialize();
    expect(m.definitions.map((d) => d.id).sort()).toEqual(["read_file", "write_file"]);
    expect(m.denied).toEqual([]);
  });

  it("hides wholly-denied tools from the model", () => {
    const reg = new ToolRegistry();
    reg.register(makeDefinition("read_file"));
    reg.register(makeDefinition("shell_exec", "write"));
    const m = reg.materialize([{ action: "shell_exec", effect: "deny" }]);
    expect(m.definitions.map((d) => d.id)).toEqual(["read_file"]);
    expect(m.denied.map((d) => d.id)).toEqual(["shell_exec"]);
  });

  it("applies wildcard deny rules", () => {
    const reg = new ToolRegistry();
    reg.register(makeDefinition("coding.read_file"));
    reg.register(makeDefinition("search_code"));
    const m = reg.materialize([{ action: "coding.*", effect: "deny" }]);
    expect(m.definitions.map((d) => d.id)).toEqual(["search_code"]);
  });

  it("settle executes allowed tools and rejects unknown names", async () => {
    const reg = new ToolRegistry();
    reg.register({
      ...makeDefinition("echo"),
      async execute(input) {
        return `echo:${(input as { text?: string }).text ?? ""}`;
      },
    });
    const m = reg.materialize();
    await expect(m.settle({ name: "echo", args: { text: "hi" } })).resolves.toBe("echo:hi");
    await expect(m.settle({ name: "nope", args: {} })).rejects.toThrow("Tool not found");
  });

  it("settle validates input via Zod schema when available", async () => {
    const reg = new ToolRegistry();
    reg.register({
      id: "read_file",
      description: "Read",
      risk: "read",
      inputZodSchema: z.object({ path: z.string() }),
      async execute(input) { return (input as { path: string }).path; },
    });
    const m = reg.materialize();
    await expect(m.settle({ name: "read_file", args: { path: "/tmp" } })).resolves.toBe("/tmp");
    await expect(m.settle({ name: "read_file", args: {} })).rejects.toThrow("Tool read_file input error");
  });

  it("getTool returns allowed tool by ID", () => {
    const reg = new ToolRegistry();
    reg.register(makeDefinition("read_file"));
    reg.register(makeDefinition("shell_exec", "write"));
    const m = reg.materialize([{ action: "shell_exec", effect: "deny" }]);
    expect(m.getTool("read_file")).toBeTruthy();
    expect(m.getTool("shell_exec")).toBeUndefined();
  });

  it("settle accepts custom ToolContext", async () => {
    const reg = new ToolRegistry();
    reg.register({
      ...makeDefinition("ctx_tool"),
      async execute(_input, ctx) {
        return ctx.runId;
      },
    });
    const m = reg.materialize();
    const customCtx = {
      sessionId: "s1", runId: "r1", agentId: "a1", agentName: "agent",
      signal: new AbortController().signal, env: {},
      ask: async () => "once" as const, metadata: () => {}, setCompensation: () => {},
    };
    await expect(m.settle({ name: "ctx_tool", args: {}, ctx: customCtx })).resolves.toBe("r1");
  });
});

describe("ToolRegistry domain methods", () => {
  function makeDefinition(id: string): ToolDefinition {
    return { id, description: `Tool ${id}`, risk: "read", async execute() { return "ok"; } };
  }

  it("listDomains returns registered domains", () => {
    const reg = new ToolRegistry();
    const tools1 = [makeDefinition("read_file"), makeDefinition("write_file")];
    const tools2 = [makeDefinition("search")];
    reg.registerDomain({ id: "coding", tools: tools1 });
    reg.registerDomain({ id: "search", tools: tools2 });
    const domains = reg.listDomains();
    expect(domains.map((d) => d.id)).toEqual(["coding", "search"]);
  });

  it("toolsForDomain returns tools for a domain", () => {
    const reg = new ToolRegistry();
    const tools = [makeDefinition("read_file"), makeDefinition("write_file")];
    reg.registerDomain({ id: "coding", tools });
    expect(reg.toolsForDomain("coding").map((t) => t.id)).toEqual(["read_file", "write_file"]);
    expect(reg.toolsForDomain("nonexistent")).toEqual([]);
  });

  it("domainSummaries returns summary info", () => {
    const reg = new ToolRegistry();
    reg.registerDomain({
      id: "coding",
      tools: [makeDefinition("read_file"), makeDefinition("write_file")],
      systemPrompt: "You are a coder",
    });
    reg.registerDomain({ id: "search", tools: [makeDefinition("search")] });
    const summaries = reg.domainSummaries();
    expect(summaries).toEqual([
      { id: "coding", toolCount: 2, toolIds: ["read_file", "write_file"], hasSystemPrompt: true },
      { id: "search", toolCount: 1, toolIds: ["search"], hasSystemPrompt: false },
    ]);
  });
});
