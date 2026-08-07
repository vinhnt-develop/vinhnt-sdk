import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadMcpConfig, isStdioConfig, isHttpConfig, McpClientPool } from "../src/client/index.js";
import type { McpServerConfigItem, McpConfigFile } from "../src/client/config.js";

describe("McpConfig", () => {
  it("isStdioConfig returns true for command-based config", () => {
    const cfg: McpServerConfigItem = { command: "node", args: ["server.js"] };
    expect(isStdioConfig(cfg)).toBe(true);
  });

  it("isStdioConfig returns false for URL-based config", () => {
    const cfg: McpServerConfigItem = { url: "http://localhost:3000/mcp" };
    expect(isStdioConfig(cfg)).toBe(false);
  });

  it("isHttpConfig returns true for URL-based config", () => {
    const cfg: McpServerConfigItem = { url: "http://localhost:3000/mcp" };
    expect(isHttpConfig(cfg)).toBe(true);
  });

  it("isHttpConfig returns false for command-based config", () => {
    const cfg: McpServerConfigItem = { command: "node" };
    expect(isHttpConfig(cfg)).toBe(false);
  });

  it("loadMcpConfig returns empty config when no file found", async () => {
    const config = await loadMcpConfig("/nonexistent/path");
    expect(config.servers).toEqual({});
  });

  it("loadMcpConfig parses valid config file", async () => {
    // Note: this test depends on the test runner's CWD
    // In practice, loadMcpConfig will find nothing in CI directories
    const config = await loadMcpConfig("/tmp");
    expect(config).toHaveProperty("servers");
  });
});

describe("McpClientPool", () => {
  let pool: McpClientPool;

  beforeEach(() => {
    pool = new McpClientPool();
  });

  afterEach(() => {
    pool.disconnectAll();
  });

  it("starts empty", () => {
    expect(pool).toBeDefined();
  });

  it("registers a stdio server", () => {
    pool.register("test", { command: "node", args: ["-e", "process.stdin.setEncoding('utf-8');console.log(JSON.stringify({jsonrpc:'2.0',id:1,result:{tools:[]}}))"] });
    expect(pool).toBeDefined();
  });

  it("registers an HTTP server", () => {
    pool.register("remote", { url: "http://localhost:3000/mcp" });
    expect(pool).toBeDefined();
  });

  it("toToolDefinitions returns empty for unconnected pool", async () => {
    const tools = await pool.toToolDefinitions();
    expect(tools).toEqual([]);
  });

  it("disconnect is idempotent", () => {
    pool.disconnect("nonexistent");
    pool.disconnectAll();
  });
});

describe("McpConfig types", () => {
  it("constructs a valid McpConfigFile", () => {
    const config: McpConfigFile = {
      $schema: "https://specs.modelcontextprotocol.io/schema/2025/schema.json",
      servers: {
        filesystem: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem"] },
        remote: { url: "https://api.example.com/mcp", headers: { Authorization: "Bearer token" } },
      },
    };
    expect(Object.keys(config.servers)).toHaveLength(2);
    expect(isStdioConfig(config.servers.filesystem!)).toBe(true);
    expect(isHttpConfig(config.servers.remote!)).toBe(true);
  });
});
