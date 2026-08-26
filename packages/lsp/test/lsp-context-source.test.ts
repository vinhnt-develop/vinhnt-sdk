import { describe, it, expect, vi } from "vitest";
import { createLspContextSource } from "../src/lsp-context-source.js";

describe("createLspContextSource", () => {
  function createMockPool() {
    return {
      getStatus: vi.fn().mockReturnValue([]),
      diagnostics: {
        getAll: vi.fn().mockReturnValue([]),
      },
    };
  }

  it("returns context source with correct key", () => {
    const pool = createMockPool() as never;
    const source = createLspContextSource(pool);
    expect(source.key).toBe("lsp.status");
  });

  it("load returns empty state when no servers active", async () => {
    const pool = createMockPool() as never;
    const source = createLspContextSource(pool);
    const ctx = await source.load();
    expect(ctx.activeServers).toBe(0);
    expect(ctx.serverList).toEqual([]);
    expect(ctx.errorCount).toBe(0);
    expect(ctx.warningCount).toBe(0);
    expect(ctx.diagnosticSummary).toBe("");
  });

  it("load returns active server info", async () => {
    const pool = createMockPool();
    pool.getStatus.mockReturnValue([
      { id: "typescript", root: "/project", languageId: "typescript", connected: true, since: Date.now() },
    ]);
    const source = createLspContextSource(pool as never);
    const ctx = await source.load();
    expect(ctx.activeServers).toBe(1);
    expect(ctx.serverList[0]!.id).toBe("typescript");
    expect(ctx.serverList[0]!.language).toBe("typescript");
  });

  it("renderBaseline contains server and diagnostic info", async () => {
    const pool = createMockPool() as never;
    const source = createLspContextSource(pool);
    const ctx = await source.load();
    const rendered = source.renderBaseline(ctx);
    expect(rendered).toContain("Language Server Status");
    expect(rendered).toContain("No diagnostics");
  });

  it("renderUpdate returns null when nothing changed", () => {
    const pool = createMockPool() as never;
    const source = createLspContextSource(pool);
    const ctx = { activeServers: 0, serverList: [], diagnosticSummary: "", errorCount: 0, warningCount: 0 };
    expect(source.renderUpdate(ctx, ctx)).toBeNull();
  });

  it("renderUpdate detects diagnostic count changes", () => {
    const pool = createMockPool() as never;
    const source = createLspContextSource(pool);
    const prev = { activeServers: 0, serverList: [], diagnosticSummary: "", errorCount: 2, warningCount: 1 };
    const curr = { activeServers: 0, serverList: [], diagnosticSummary: "", errorCount: 0, warningCount: 0 };
    const update = source.renderUpdate(curr, prev);
    expect(update).not.toBeNull();
    expect(update!).toContain("Diagnostics updated");
  });

  it("renderUpdate detects server count changes", () => {
    const pool = createMockPool() as never;
    const source = createLspContextSource(pool);
    const prev = { activeServers: 0, serverList: [], diagnosticSummary: "", errorCount: 0, warningCount: 0 };
    const curr = { activeServers: 2, serverList: [{ id: "ts", language: "typescript", root: "/p" }], diagnosticSummary: "", errorCount: 0, warningCount: 0 };
    const update = source.renderUpdate(curr, prev);
    expect(update).toContain("LSP servers");
  });

  it("renderRemoval returns empty string", () => {
    const pool = createMockPool() as never;
    const source = createLspContextSource(pool);
    expect(source.renderRemoval()).toBe("");
  });
});
