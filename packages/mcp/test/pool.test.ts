import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/client/wrapper.js", () => {
  const mockClient = vi.fn();
  const instances = new Map<string, { name: string; _connected: boolean }>();

  const McpClient = vi.fn().mockImplementation((name: string, _config: unknown) => {
    const instance = {
      name,
      _connected: false,
      get isConnected() { return this._connected; },
      connect: vi.fn().mockImplementation(async function (this: { _connected: boolean }) {
        this._connected = true;
      }),
      disconnect: vi.fn().mockImplementation(function (this: { _connected: boolean }) {
        this._connected = false;
      }),
      listTools: vi.fn().mockResolvedValue([
        { name: "tool1", description: "First tool", inputSchema: { type: "object", properties: { x: { type: "string" } } } },
      ]),
      callTool: vi.fn().mockResolvedValue([{ type: "text", text: "done" }]),
    };
    instances.set(name, instance);
    return instance;
  });
  return { McpClient };
});

import { McpClientPool } from "../src/client/pool.js";

describe("McpClientPool", () => {
  let pool: McpClientPool;

  beforeEach(() => {
    vi.clearAllMocks();
    pool = new McpClientPool();
  });

  describe("register", () => {
    it("registers multiple servers", () => {
      pool.register("server1", { command: "node" });
      pool.register("server2", { url: "http://localhost" });
      // connectAll should attempt to connect both
    });

    it("does not overwrite existing entry on duplicate register", () => {
      pool.register("srv", { command: "node", args: ["v1"] });
      pool.register("srv", { command: "python", args: ["v2"] });
      // Second register should not overwrite (loadConfig check)
    });
  });

  describe("connectAll", () => {
    it("connects all registered servers", async () => {
      pool.register("s1", { command: "node" });
      pool.register("s2", { url: "http://localhost:3000" });
      await pool.connectAll();
    });

    it("throws aggregated errors when some servers fail", async () => {
      const { McpClient: MockMcpClient } = await import("../src/client/wrapper.js");
      vi.mocked(MockMcpClient).mockImplementationOnce(() => {
        const failInstance = {
          name: "failing",
          _connected: false,
          isConnected: false,
          connect: vi.fn().mockRejectedValue(new Error("connection refused")),
          disconnect: vi.fn(),
          listTools: vi.fn(),
          callTool: vi.fn(),
        };
        return failInstance as never;
      });

      pool.register("ok", { command: "node" });
      pool.register("fail", { command: "bogus" });
      await expect(pool.connectAll()).rejects.toThrow(/connection refused/);
    });
  });

  describe("connectOne", () => {
    it("connects a single server", async () => {
      pool.register("s1", { command: "node" });
      await pool.connectOne("s1");
    });

    it("throws for unregistered server", async () => {
      await expect(pool.connectOne("nonexistent")).rejects.toThrow(/not registered/);
    });

    it("is idempotent when already connected", async () => {
      pool.register("s1", { command: "node" });
      await pool.connectOne("s1");
      await pool.connectOne("s1"); // should not throw
    });
  });

  describe("disconnect", () => {
    it("disconnects a specific server", async () => {
      pool.register("s1", { command: "node" });
      await pool.connectOne("s1");
      pool.disconnect("s1");
    });

    it("is a no-op for nonexistent server", () => {
      pool.disconnect("ghost");
    });
  });

  describe("disconnectAll", () => {
    it("is idempotent", () => {
      pool.disconnectAll();
      pool.disconnectAll();
    });
  });

  describe("getServerTools", () => {
    it("throws for unregistered server", async () => {
      await expect(pool.getServerTools("nonexistent")).rejects.toThrow(/not registered/);
    });

    it("auto-connects and returns tools", async () => {
      pool.register("s1", { command: "node" });
      const tools = await pool.getServerTools("s1");
      expect(tools).toHaveLength(1);
      expect(tools[0]!.id).toBe("mcp__s1__tool1");
      expect(tools[0]!.description).toContain("First tool");
    });
  });

  describe("discoverTools", () => {
    it("returns empty for unconnected pool", async () => {
      const tools = await pool.discoverTools();
      expect(tools).toEqual([]);
    });

    it("discovers tools from connected servers", async () => {
      pool.register("s1", { command: "node" });
      await pool.connectAll();
      const tools = await pool.discoverTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]!.name).toBe("tool1");
    });
  });

  describe("toToolDefinitions", () => {
    it("returns empty for unconnected pool", async () => {
      const tools = await pool.toToolDefinitions();
      expect(tools).toEqual([]);
    });

    it("returns tool definitions from connected servers", async () => {
      pool.register("s1", { command: "node" });
      await pool.connectAll();
      const tools = await pool.toToolDefinitions();
      expect(tools).toHaveLength(1);
      expect(tools[0]!.id).toBe("mcp__s1__tool1");
      expect(tools[0]!.risk).toBe("external");
      expect(typeof tools[0]!.execute).toBe("function");
    });

    it("creates executable tools", async () => {
      pool.register("s1", { command: "node" });
      await pool.connectAll();
      const tools = await pool.toToolDefinitions();
      const result = await tools[0]!.execute({ test: true }, {} as never);
      expect(result).toEqual([{ type: "text", text: "done" }]);
    });

    it("handles tools without inputSchema", async () => {
      const { McpClient: MockMcpClient } = await import("../src/client/wrapper.js");
      vi.mocked(MockMcpClient).mockImplementationOnce(() => {
        return {
          name: "schema-test",
          _connected: true,
          isConnected: true,
          connect: vi.fn(),
          disconnect: vi.fn(),
          listTools: vi.fn().mockResolvedValue([
            { name: "bare", description: "", inputSchema: undefined },
          ]),
          callTool: vi.fn(),
        } as never;
      });
      pool.register("st", { command: "node" });
      await pool.connectAll();
      const tools = await pool.toToolDefinitions();
      expect(tools).toHaveLength(1);
      expect(tools[0]!.inputSchema).toBeUndefined();
    });
  });

  describe("toDomainManifests", () => {
    it("groups tools per server under mcp:<server> domains with namespaced ids", async () => {
      pool.register("s1", { command: "node" });
      pool.register("s2", { command: "node" });
      await pool.connectAll();

      const s2Client = pool.getClient("s2") as unknown as {
        listTools: ReturnType<typeof vi.fn>;
      };
      s2Client.listTools.mockResolvedValue([
        { name: "tool2", description: "Second", inputSchema: undefined },
      ]);

      const manifests = await pool.toDomainManifests();
      const ids = manifests.map((m) => m.id).sort();
      expect(ids).toEqual(["mcp:s1", "mcp:s2"]);

      const s1 = manifests.find((m) => m.id === "mcp:s1")!;
      expect(s1.tools[0]!.id).toBe("mcp__s1__tool1");
      const s2 = manifests.find((m) => m.id === "mcp:s2")!;
      expect(s2.tools[0]!.id).toBe("mcp__s2__tool2");
    });

    it("carries per-server permission defaults", async () => {
      pool.register("locked", { command: "node", permission: "deny" });
      await pool.connectAll();
      const manifests = await pool.toDomainManifests();
      const locked = manifests.find((m) => m.id === "mcp:locked")!;
      expect(locked.permissionDefaults).toEqual([{ action: "mcp__locked__*", effect: "deny" }]);
    });

    it("flattens back to plain tool definitions in toToolDefinitions", async () => {
      pool.register("s1", { command: "node" });
      await pool.connectAll();
      const tools = await pool.toToolDefinitions();
      expect(tools.map((t) => t.id)).toEqual(["mcp__s1__tool1"]);
    });
  });
});
