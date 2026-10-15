import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

import { access, readdir, readFile } from "node:fs/promises";
import { WorkspaceManager } from "../src/workspace.js";

function mockAccessExists() {
  vi.mocked(access).mockResolvedValue(undefined as never);
}
function mockAccessMissing() {
  vi.mocked(access).mockRejectedValue(new Error("ENOENT") as never);
}

describe("WorkspaceManager", () => {
  let wm: WorkspaceManager;

  beforeEach(() => {
    vi.resetAllMocks();
    mockAccessExists();
    wm = new WorkspaceManager();
  });

  describe("add", () => {
    it("adds a workspace", async () => {
      expect(await wm.add("/tmp/test-ws")).toBe(true);
      expect(wm.size).toBe(1);
    });

    it("returns false for nonexistent directory", async () => {
      mockAccessMissing();
      expect(await wm.add("/nonexistent")).toBe(false);
      expect(wm.size).toBe(0);
    });

    it("returns false for duplicate", async () => {
      expect(await wm.add("/tmp/test-ws")).toBe(true);
      expect(await wm.add("/tmp/test-ws")).toBe(false);
      expect(wm.size).toBe(1);
    });

    it("reads package.json for name", async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({ name: "@test/workspace" }) as never,
      );
      await wm.add("/tmp/test-ws");
      const ws = wm.get("/tmp/test-ws")!;
      expect(ws.name).toBe("@test/workspace");
    });

    it("falls back to dirname when no package.json", async () => {
      vi.mocked(access).mockImplementation((p) =>
        String(p).endsWith("package.json")
          ? Promise.reject(new Error("ENOENT") as never)
          : Promise.resolve(undefined as never),
      );
      await wm.add("/tmp/test-ws");
      const ws = wm.get("/tmp/test-ws")!;
      expect(ws.name).toBe("test-ws");
    });

    it("emits added event", async () => {
      const fn = vi.fn();
      wm.onEvent(fn);
      await wm.add("/tmp/test-ws");
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "workspace.added", root: expect.stringContaining("test-ws") }));
    });
  });

  describe("remove", () => {
    it("removes a workspace", async () => {
      await wm.add("/tmp/ws");
      expect(wm.remove("/tmp/ws")).toBe(true);
      expect(wm.size).toBe(0);
    });

    it("returns false for nonexistent", () => {
      expect(wm.remove("/ghost")).toBe(false);
    });

    it("emits removed event", async () => {
      const fn = vi.fn();
      wm.onEvent(fn);
      await wm.add("/tmp/ws");
      wm.remove("/tmp/ws");
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "workspace.removed" }));
    });

    it("clears activeRoot when removing active workspace", async () => {
      await wm.add("/tmp/ws");
      wm.activate("/tmp/ws");
      wm.remove("/tmp/ws");
      expect(wm.getActive()).toBeNull();
    });
  });

  describe("activate", () => {
    it("activates a workspace", async () => {
      await wm.add("/tmp/ws-a");
      await wm.add("/tmp/ws-b");
      expect(wm.activate("/tmp/ws-b")).toBe(true);
      const active = wm.getActive();
      expect(active).not.toBeNull();
      expect(active!.root).toContain("ws-b");
    });

    it("deactivates others when activating a new one", async () => {
      await wm.add("/tmp/ws-a");
      await wm.add("/tmp/ws-b");
      wm.activate("/tmp/ws-a");
      wm.activate("/tmp/ws-b");
      const list = wm.list();
      expect(list.find((w) => w.root.includes("ws-a"))!.isActive).toBe(false);
      expect(list.find((w) => w.root.includes("ws-b"))!.isActive).toBe(true);
    });

    it("returns false for unregistered root", () => {
      expect(wm.activate("/non-existent")).toBe(false);
    });

    it("emits activated event", async () => {
      const fn = vi.fn();
      wm.onEvent(fn);
      await wm.add("/tmp/ws");
      wm.activate("/tmp/ws");
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "workspace.activated" }));
    });
  });

  describe("deactivate", () => {
    it("deactivates current workspace", async () => {
      await wm.add("/tmp/ws");
      wm.activate("/tmp/ws");
      wm.deactivate();
      expect(wm.getActive()).toBeNull();
    });

    it("is no-op when none active", () => {
      wm.deactivate();
      expect(wm.getActive()).toBeNull();
    });

    it("emits deactivated event", async () => {
      const fn = vi.fn();
      wm.onEvent(fn);
      await wm.add("/tmp/ws");
      wm.activate("/tmp/ws");
      wm.deactivate();
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "workspace.deactivated" }));
    });
  });

  describe("getActive", () => {
    it("returns null when none active", () => {
      expect(wm.getActive()).toBeNull();
    });

    it("returns null when active workspace removed", async () => {
      await wm.add("/tmp/ws");
      wm.activate("/tmp/ws");
      wm.remove("/tmp/ws");
      expect(wm.getActive()).toBeNull();
    });
  });

  describe("list", () => {
    it("returns all workspaces", async () => {
      await wm.add("/tmp/a");
      await wm.add("/tmp/b");
      expect(wm.list()).toHaveLength(2);
    });

    it("returns copy (immutable)", async () => {
      await wm.add("/tmp/a");
      const list1 = wm.list();
      await wm.add("/tmp/b");
      const list2 = wm.list();
      expect(list1).toHaveLength(1);
      expect(list2).toHaveLength(2);
    });
  });

  describe("onEvent", () => {
    it("unsubscribes listener", async () => {
      const fn = vi.fn();
      const unsub = wm.onEvent(fn);
      unsub();
      await wm.add("/tmp/ws");
      expect(fn).not.toHaveBeenCalled();
    });

    it("isolates listener errors", async () => {
      wm.onEvent(() => { throw new Error("boom"); });
      await wm.add("/tmp/ws");
      expect(wm.size).toBe(1);
    });
  });

  describe("detect", () => {
    it("returns empty when no workspace markers", async () => {
      mockAccessMissing();
      vi.mocked(readdir).mockResolvedValue([] as never);
      const results = await WorkspaceManager.detect("/tmp");
      expect(results).toEqual([]);
    });

    it("detects root with .vnt/config.json", async () => {
      vi.mocked(access).mockImplementation((p) =>
        String(p).includes(".vnt") || String(p).includes("package.json") || String(p).includes(".git")
          ? Promise.resolve(undefined as never)
          : Promise.reject(new Error("ENOENT") as never),
      );
      vi.mocked(readdir).mockResolvedValue([] as never);
      const results = await WorkspaceManager.detect("/tmp/project");
      expect(results.some((r) => r.includes("project"))).toBe(true);
    });

    it("detects root with package.json", async () => {
      vi.mocked(access).mockImplementation((p) =>
        String(p).endsWith("package.json") || String(p).endsWith(".git")
          ? Promise.resolve(undefined as never)
          : Promise.reject(new Error("ENOENT") as never),
      );
      vi.mocked(readdir).mockResolvedValue([] as never);
      const results = await WorkspaceManager.detect("/tmp/mono");
      expect(results.some((r) => r.includes("mono"))).toBe(true);
    });

    it("detects subdirectory workspaces", async () => {
      vi.mocked(readdir).mockResolvedValue([
        { name: "pkg-a", isDirectory: () => true } as never,
        { name: "pkg-b", isDirectory: () => true } as never,
        { name: ".hidden", isDirectory: () => true } as never,
        { name: "node_modules", isDirectory: () => true } as never,
        { name: "file.txt", isDirectory: () => false } as never,
      ]);
      // Root check: all markers return false
      // Subdir check: only pkg-a and pkg-b have .git marker
      vi.mocked(access).mockImplementation((p) =>
        String(p).includes("pkg-a") || String(p).includes("pkg-b")
          ? Promise.resolve(undefined as never)
          : Promise.reject(new Error("ENOENT") as never),
      );
      const results = await WorkspaceManager.detect("/tmp/mono");
      expect(results.some((r) => r.includes("pkg-a"))).toBe(true);
      expect(results.some((r) => r.includes("pkg-b"))).toBe(true);
      expect(results.some((r) => r.includes("node_modules"))).toBe(false);
    });

    it("handles readdir errors gracefully", async () => {
      mockAccessMissing();
      vi.mocked(readdir).mockRejectedValue(new Error("permission denied") as never);
      const results = await WorkspaceManager.detect("/tmp/protected");
      expect(results).toEqual([]);
    });
  });

  describe("workspace properties", () => {
    it("generates deterministic workspace ID", async () => {
      await wm.add("/tmp/ws");
      const ws = wm.get("/tmp/ws")!;
      expect(ws.id).toMatch(/^ws_[0-9a-f]{8}$/);
    });

    it("sets addedAt timestamp", async () => {
      const before = Date.now();
      await wm.add("/tmp/ws");
      const ws = wm.get("/tmp/ws")!;
      expect(ws.addedAt).toBeGreaterThanOrEqual(before);
    });
  });
});
