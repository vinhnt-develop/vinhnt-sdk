import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadMcpConfig } from "../src/client/config.js";

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
  readFile: vi.fn(),
}));

import { access, readFile } from "node:fs/promises";

describe("loadMcpConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty config when no file found", async () => {
    vi.mocked(access).mockRejectedValue(new Error("ENOENT"));
    const result = await loadMcpConfig("/test");
    expect(result).toEqual({ servers: {} });
    expect(access).toHaveBeenCalledTimes(3);
  });

  it("reads .mcp.json from cwd first", async () => {
    vi.mocked(access).mockResolvedValueOnce(undefined);
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({ servers: { test: { command: "node" } } }));
    const result = await loadMcpConfig("/test");
    expect(result.servers.test).toBeDefined();
    expect(vi.mocked(readFile).mock.calls[0]![0]).toContain(".mcp.json");
  });

  it("falls back to mcp.json when .mcp.json not found", async () => {
    vi.mocked(access)
      .mockRejectedValueOnce(new Error("ENOENT"))
      .mockResolvedValueOnce(undefined);
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({ servers: { test: { command: "node" } } }));
    const result = await loadMcpConfig("/test");
    expect(result.servers.test).toBeDefined();
    expect(vi.mocked(readFile).mock.calls[0]![0]).toContain("mcp.json");
  });

  it("returns empty for invalid JSON", async () => {
    vi.mocked(access).mockResolvedValueOnce(undefined);
    vi.mocked(readFile).mockRejectedValueOnce(new Error("bad json"));
    const result = await loadMcpConfig("/test");
    expect(result).toEqual({ servers: {} });
  });

  it("returns empty when servers field is missing", async () => {
    vi.mocked(access).mockResolvedValueOnce(undefined);
    vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({}));
    const result = await loadMcpConfig("/test");
    expect(result).toEqual({ servers: {} });
  });
});
