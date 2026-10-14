import { describe, expect, it, vi } from "vitest";
import { PassThrough } from "node:stream";
import {
  McpServer,
  McpStdioServer,
  mapToolDefinitionToMcp,
  MCP_DEFAULT_PROTOCOL_VERSION,
} from "../src/index.js";
import type { McpServerOptions, McpToolExecutor, McpStdioServerOptions } from "../src/index.js";
import type { ToolDefinition } from "@vinhnt-sdk/tools";
import type { JsonRpcRequest } from "@vinhnt-sdk/schema";

function req(id: number | string, method: string, params?: unknown): JsonRpcRequest {
  return { jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) };
}

const echoTool: ToolDefinition = {
  id: "echo",
  name: "echo",
  description: "Echo the input text",
  risk: "read",
  inputSchema: { type: "object", properties: { text: { type: "string" } } },
  metadata: { source: "system" },
  annotations: { readOnlyHint: true },
  async execute(input: { text: string }) {
    return `echo: ${input.text}`;
  },
};

const boomTool: ToolDefinition = {
  id: "boom",
  description: "Always throws",
  risk: "destructive",
  inputSchema: { type: "object" },
  async execute() {
    throw new Error("kaboom");
  },
};

function makeServer(tools: ToolDefinition[] = [echoTool, boomTool], overrides: Partial<McpServerOptions> = {}): McpServer {
  return new McpServer({ name: "test-server", version: "1.2.3", tools, ...overrides });
}

describe("McpServer dispatch (G6.2, MCP 2026-07-28 stateless)", () => {
  it("answers initialize with capabilities + serverInfo (default protocol 2026-07-28)", async () => {
    expect(MCP_DEFAULT_PROTOCOL_VERSION).toBe("2026-07-28");
    const server = makeServer();
    const response = await server.dispatch(req(1, "initialize", { protocolVersion: "2026-07-28" }));
    expect(response.error).toBeUndefined();
    expect(response.result).toEqual({
      protocolVersion: "2026-07-28",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "test-server", version: "1.2.3" },
    });
    const custom = makeServer([], { protocolVersion: "2025-06-18", version: "9.9.9" });
    const res = await custom.dispatch(req(1, "initialize"));
    expect(res.result).toMatchObject({ protocolVersion: "2025-06-18", serverInfo: { version: "9.9.9" } });
  });

  it("answers ping", async () => {
    const response = await makeServer().dispatch(req(2, "ping"));
    expect(response.result).toEqual({});
  });

  it("lists tools with provenance stripped off the wire", async () => {
    const response = await makeServer().dispatch(req(3, "tools/list"));
    const result = response.result as { tools: Array<Record<string, unknown>> };
    expect(result.tools).toHaveLength(2);
    const wire = result.tools.find((t) => t.name === "echo")!;
    expect(wire).toMatchObject({
      name: "echo",
      description: "Echo the input text",
      inputSchema: { type: "object" },
      annotations: { readOnlyHint: true },
    });
    expect(wire).not.toHaveProperty("risk");
    expect(wire).not.toHaveProperty("metadata");
    expect(JSON.stringify(result.tools)).not.toContain("destructive");
  });

  it("calls tools: string/object outputs, default ctx is fail-closed", async () => {
    const server = makeServer();
    const ok = await server.dispatch(req(4, "tools/call", { name: "echo", arguments: { text: "hi" } }));
    expect(ok.result).toEqual({ content: [{ type: "text", text: "echo: hi" }] });

    const objectTool: ToolDefinition = {
      id: "obj",
      description: "",
      risk: "read",
      async execute() {
        return { answer: 42 };
      },
    };
    const obj = await makeServer([objectTool]).dispatch(req(5, "tools/call", { name: "obj" }));
    expect(obj.result).toEqual({ content: [{ type: "text", text: JSON.stringify({ answer: 42 }) }] });

    const askTool: ToolDefinition = {
      id: "asky",
      description: "",
      risk: "external",
      async execute(_input, ctx) {
        ctx.metadata({ title: "asky" });
        ctx.setCompensation(async () => {});
        return ctx.ask({ permission: "shell", resource: "rm", reason: "manual" });
      },
    };
    const ask = await makeServer([askTool]).dispatch(req(6, "tools/call", { name: "asky" }));
    expect(ask.result).toEqual({ content: [{ type: "text", text: "reject" }] }); // no approval UI → fail closed
  });

  it("uses an injected executor when provided", async () => {
    const executor: McpToolExecutor = vi.fn(async () => "from-executor");
    const server = makeServer([echoTool], { executeTool: executor });
    const response = await server.dispatch(req(7, "tools/call", { name: "echo", arguments: { a: 1 } }));
    expect(executor).toHaveBeenCalledWith(echoTool, { a: 1 });
    expect(response.result).toEqual({ content: [{ type: "text", text: "from-executor" }] });
  });

  it("returns isError results for tool failures, not protocol errors", async () => {
    const response = await makeServer().dispatch(req(8, "tools/call", { name: "boom" }));
    expect(response.error).toBeUndefined();
    expect(response.result).toEqual({ content: [{ type: "text", text: "kaboom" }], isError: true });
  });

  it("maps protocol errors: unknown method -32601, bad/unknown tool params -32602", async () => {
    const server = makeServer();
    expect((await server.dispatch(req(9, "resources/list"))).error?.code).toBe(-32601);
    expect((await server.dispatch(req(10, "tools/call", { name: "nope" }))).error?.code).toBe(-32602);
    expect((await server.dispatch(req(11, "tools/call", {}))).error?.code).toBe(-32602);
  });

  it("maps unexpected handler failures to -32603", async () => {
    const poisoned: ToolDefinition = {
      id: "poison",
      description: "",
      risk: "read",
      get inputSchema(): never {
        throw new Error("schema exploded");
      },
      async execute() {
        return "unreachable";
      },
    } as ToolDefinition;
    const response = await makeServer([poisoned]).dispatch(req(12, "tools/list"));
    expect(response.error).toEqual({ code: -32603, message: "schema exploded" });
  });

  it("accepts and drops notifications (stateless)", async () => {
    await expect(makeServer().handleNotification({ jsonrpc: "2.0", method: "notifications/initialized" })).resolves.toBeUndefined();
  });
});

describe("mapToolDefinitionToMcp (G6.2 inverse mapper)", () => {
  it("emits wire fields only and falls back to id when name is missing", () => {
    const tool: ToolDefinition = {
      id: "my_tool",
      description: "desc",
      risk: "write",
      metadata: { source: "custom" },
      async execute() {},
    };
    const mapped = mapToolDefinitionToMcp(tool);
    expect(mapped.name).toBe("my_tool");
    expect(mapped.description).toBe("desc");
    expect(mapped.inputSchema).toEqual({ type: "object" });
    expect(Object.keys(mapped).sort()).toEqual(["description", "inputSchema", "name"]);
  });
});

describe("McpStdioServer (G6.2 newline-delimited transport)", () => {
  function setup(): {
    server: McpServer;
    stdio: McpStdioServer;
    input: PassThrough;
    lines: () => string[];
  } {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: string[] = [];
    output.on("data", (c: Buffer) => chunks.push(c.toString()));
    const options: McpStdioServerOptions = { input, output };
    const stdio = new McpStdioServer(makeServer(), options);
    stdio.start();
    return { server: makeServer(), stdio, input, lines: () => chunks.join("").split("\n").filter((l) => l.length > 0) };
  }

  it("routes requests to responses and ignores junk/notifications", async () => {
    const { stdio, input, lines } = setup();
    input.write(
      [
        JSON.stringify(req("a", "initialize")),
        "not json at all",
        JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
        JSON.stringify(req("b", "tools/call", { name: "echo", arguments: { text: "x" } })),
        "",
      ].join("\n") + "\n",
    );
    await vi.waitFor(() => expect(lines()).toHaveLength(2));
    const responses = lines().map((l) => JSON.parse(l) as { id: string; result?: unknown });
    expect(responses.map((r) => r.id)).toEqual(["a", "b"]);
    expect(responses[0]?.result).toMatchObject({ serverInfo: { name: "test-server" } });
    expect(responses[1]?.result).toEqual({ content: [{ type: "text", text: "echo: x" }] });
    stdio.stop();
  });

  it("stops responding after stop() and ignores empty lines via handleLine", async () => {
    const { stdio, input, lines } = setup();
    await stdio.handleLine("   ");
    expect(lines()).toHaveLength(0);
    input.write(JSON.stringify(req(1, "ping")) + "\n");
    await vi.waitFor(() => expect(lines()).toHaveLength(1));
    stdio.stop();
    input.write(JSON.stringify(req(2, "ping")) + "\n");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(lines()).toHaveLength(1);
    stdio.stop(); // idempotent
  });
});
