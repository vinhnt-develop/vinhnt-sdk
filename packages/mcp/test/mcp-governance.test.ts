import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { McpConnection } from "../src/client.js";
import type { McpTool } from "../src/types.js";
import {
  capMcpOutput,
  discoverMcpTools,
  filterMcpTools,
  searchMcpTools,
} from "../src/index.js";

const catalog: McpTool[] = [
  { name: "get_weather", description: "Fetch the current weather for a city", inputSchema: { type: "object" } },
  { name: "send_email", description: "Send an email message", inputSchema: { type: "object" } },
  { name: "read_file", description: "Read a file from disk", inputSchema: { type: "object" } },
];

function makeConnection(resultText = "ok"): McpConnection {
  return {
    serverInfo: { name: "srv", version: "1.0.0" },
    capabilities: {},
    protocolVersion: "2026-07-28",
    async listTools() {
      return catalog;
    },
    async callTool() {
      return { content: [{ type: "text", text: resultText }] };
    },
    async listResources() {
      return [];
    },
    async readResource() {
      return "";
    },
    async listPrompts() {
      return [];
    },
    async getPrompt() {
      return "";
    },
    async close() {},
  };
}

describe("MCP governance", () => {
  it("filters raw MCP tools by allowlist then denylist", () => {
    const allowed = filterMcpTools(catalog, { allowedTools: ["get_weather", "read_file"] });
    expect(allowed.map((t) => t.name)).toEqual(["get_weather", "read_file"]);

    const denied = filterMcpTools(catalog, {
      allowedTools: ["get_weather", "read_file"],
      deniedTools: ["read_file"],
    });
    expect(denied.map((t) => t.name)).toEqual(["get_weather"]);

    expect(filterMcpTools(catalog, { allowedTools: [] })).toEqual([]);
  });

  it("discovers only allowed tools and caps output with a file spill", async () => {
    const dir = await mkdtemp(join(tmpdir(), "vinhnt-mcp-test-"));
    try {
      const full = "x".repeat(100);
      const tools = await discoverMcpTools("srv", makeConnection(full), {
        governance: { allowedTools: ["get_weather"], maxOutputBytes: 16, spillDir: dir },
      });

      expect(tools).toHaveLength(1);
      const tool = tools[0]!;
      expect(tool.id).toBe("mcp__srv__get_weather");

      const output = (await tool.execute({}, undefined as never)) as string;
      expect(output.startsWith("x".repeat(16))).toBe(true);
      expect(output).toContain("[MCP output truncated: 100 bytes; full output spilled to");
      const spillPath = output.match(/spilled to (.+?)\]/)?.[1];
      expect(spillPath).toBeDefined();
      await expect(readFile(spillPath!, "utf8")).resolves.toBe(full);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns short output unchanged and can disable the cap", async () => {
    await expect(capMcpOutput("srv", "t", "short", { maxOutputBytes: 16 })).resolves.toBe("short");
    const uncapped = await capMcpOutput("srv", "t", "x".repeat(100), { maxOutputBytes: 0 });
    expect(uncapped).toBe("x".repeat(100));
  });

  it("adds a synthetic catalog-search tool when the catalog reaches the threshold", async () => {
    const tools = await discoverMcpTools("srv", makeConnection(), {
      governance: { searchThreshold: 2 },
    });

    expect(tools).toHaveLength(4);
    const search = tools.find((tool) => tool.id === "mcp__srv__search_tools");
    expect(search).toBeDefined();
    const result = (await search!.execute({ query: "weather" }, undefined as never)) as {
      results: Array<{ id: string }>;
    };
    expect(result.results.map((r) => r.id)).toEqual(["mcp__srv__get_weather"]);
  });

  it("searches by name and description with a limit", () => {
    const tools = catalog.map((tool) => ({
      id: `mcp__srv__${tool.name}`,
      name: `mcp__srv__${tool.name}`,
      description: tool.description ?? "",
      risk: "external",
      metadata: { server: "srv" },
      async execute() {},
    }));

    const weather = searchMcpTools(tools, "weather").map((r) => r.name);
    expect(weather).toEqual(["mcp__srv__get_weather"]);

    const file = searchMcpTools(tools, "file disk").map((r) => r.name);
    expect(file).toEqual(["mcp__srv__read_file"]);

    expect(searchMcpTools(tools, "send", 1)).toHaveLength(1);
    expect(searchMcpTools(tools, "   ")).toEqual([]);
  });
});
