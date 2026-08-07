import { describe, it, expect, vi } from "vitest";

vi.mock("@modelcontextprotocol/client", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue({ tools: [] }),
    callTool: vi.fn().mockResolvedValue({ content: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  StreamableHTTPClientTransport: vi.fn(),
}));

vi.mock("@modelcontextprotocol/client/stdio", () => ({
  StdioClientTransport: vi.fn(),
}));

describe("McpClient", () => {
  it("throws for unsupported config on connect", async () => {
    const { McpClient } = await import("../src/client/wrapper.js");
    const client = new McpClient("test", {} as never);
    await expect(client.connect()).rejects.toThrow(/unsupported/i);
  });

  it("throws for config with only env field on connect", async () => {
    const { McpClient } = await import("../src/client/wrapper.js");
    const client = new McpClient("test", { env: { FOO: "bar" } } as never);
    await expect(client.connect()).rejects.toThrow(/unsupported/i);
  });

  it("creates client for stdio config", async () => {
    const { McpClient } = await import("../src/client/wrapper.js");
    const client = new McpClient("test", { command: "node", args: ["-e", ""] });
    expect(client.name).toBe("test");
    expect(client.isConnected).toBe(false);
  });

  it("creates client for http config", async () => {
    const { McpClient } = await import("../src/client/wrapper.js");
    const client = new McpClient("remote", { url: "https://example.com/mcp" });
    expect(client.name).toBe("remote");
  });
});
