import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { WorkspaceManager } from "../src/workspace.js";

describe("WorkspaceManager", () => {
  let wm: WorkspaceManager;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(existsSync).mockReturnValue(true);
    wm = new WorkspaceManager();
  });

  describe("add", () => {
    it("adds a workspace", () => {
      expect(wm.add("/tmp/test-ws")).toBe(true);
      expect(wm.size).toBe(1);
    });

    it("returns false for nonexistent directory", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(wm.add("/nonexistent")).toBe(false);
      expect(wm.size).toBe(0);
    });

    it("returns false for duplicate", () => {
      expect(wm.add("/tmp/test-ws")).toBe(true);
      expect(wm.add("/tmp/test-ws")).toBe(false);
      expect(wm.size).toBe(1);
    });

    it("reads package.json for name", () => {
      vi.mocked(existsSync).mockImplementation((p) => (p as string).endsWith("package.json") ? true : true);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: "@test/workspace" }));
      wm.add("/tmp/test-ws");
      const ws = wm.get("/tmp/test-ws")!;
      expect(ws.name).toBe("@test/workspace");
    });

    it("falls back to dirname when no package.json", () => {
      vi.mocked(existsSync).mockImplementation((p) => !(p as string).endsWith("package.json"));
      wm.add("/tmp/test-ws");
      const ws = wm.get("/tmp/test-ws")!;
      expect(ws.name).toBe("test-ws");
    });

    it("emits added event", () => {
      const fn = vi.fn();
      wm.onEvent(fn);
      wm.add("/tmp/test-ws");
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "workspace.added", root: expect.stringContaining("test-ws") }));
    });
  });

  describe("remove", () => {
    it("removes a workspace", () => {
      wm.add("/tmp/ws");
      expect(wm.remove("/tmp/ws")).toBe(true);
      expect(wm.size).toBe(0);
    });

    it("returns false for nonexistent", () => {
      expect(wm.remove("/ghost")).toBe(false);
    });

    it("emits removed event", () => {
      const fn = vi.fn();
      wm.onEvent(fn);
      wm.add("/tmp/ws");
      wm.remove("/tmp/ws");
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "workspace.removed" }));
    });

    it("clears activeRoot when removing active workspace", () => {
      wm.add("/tmp/ws");
      wm.activate("/tmp/ws");
      wm.remove("/tmp/ws");
      expect(wm.getActive()).toBeNull();
    });
  });

  describe("activate", () => {
    it("activates a workspace", () => {
      wm.add("/tmp/ws-a");
      wm.add("/tmp/ws-b");
      expect(wm.activate("/tmp/ws-b")).toBe(true);
      const active = wm.getActive();
      expect(active).not.toBeNull();
      expect(active!.root).toContain("ws-b");
    });

    it("deactivates others when activating a new one", () => {
      wm.add("/tmp/ws-a");
      wm.add("/tmp/ws-b");
      wm.activate("/tmp/ws-a");
      wm.activate("/tmp/ws-b");
      const list = wm.list();
      expect(list.find((w) => w.root.includes("ws-a"))!.isActive).toBe(false);
      expect(list.find((w) => w.root.includes("ws-b"))!.isActive).toBe(true);
    });

    it("returns false for unregistered root", () => {
      expect(wm.activate("/non-existent")).toBe(false);
    });

    it("emits activated event", () => {
      const fn = vi.fn();
      wm.onEvent(fn);
      wm.add("/tmp/ws");
      wm.activate("/tmp/ws");
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "workspace.activated" }));
    });
  });

  describe("deactivate", () => {
    it("deactivates current workspace", () => {
      wm.add("/tmp/ws");
      wm.activate("/tmp/ws");
      wm.deactivate();
      expect(wm.getActive()).toBeNull();
    });

    it("is no-op when none active", () => {
      wm.deactivate();
      expect(wm.getActive()).toBeNull();
    });

    it("emits deactivated event", () => {
      const fn = vi.fn();
      wm.onEvent(fn);
      wm.add("/tmp/ws");
      wm.activate("/tmp/ws");
      wm.deactivate();
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "workspace.deactivated" }));
    });
  });

  describe("getActive", () => {
    it("returns null when none active", () => {
      expect(wm.getActive()).toBeNull();
    });

    it("returns null when active workspace removed", () => {
      wm.add("/tmp/ws");
      wm.activate("/tmp/ws");
      wm.remove("/tmp/ws");
      expect(wm.getActive()).toBeNull();
    });
  });

  describe("list", () => {
    it("returns all workspaces", () => {
      wm.add("/tmp/a");
      wm.add("/tmp/b");
      expect(wm.list()).toHaveLength(2);
    });

    it("returns copy (immutable)", () => {
      wm.add("/tmp/a");
      const list1 = wm.list();
      wm.add("/tmp/b");
      const list2 = wm.list();
      expect(list1).toHaveLength(1);
      expect(list2).toHaveLength(2);
    });
  });

  describe("onEvent", () => {
    it("unsubscribes listener", () => {
      const fn = vi.fn();
      const unsub = wm.onEvent(fn);
      unsub();
      wm.add("/tmp/ws");
      expect(fn).not.toHaveBeenCalled();
    });

    it("isolates listener errors", () => {
      wm.onEvent(() => { throw new Error("boom"); });
      wm.add("/tmp/ws");
      expect(wm.size).toBe(1);
    });
  });

  describe("detect", () => {
    it("returns empty when no workspace markers", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readdirSync).mockReturnValue([]);
      const results = WorkspaceManager.detect("/tmp");
      expect(results).toEqual([]);
    });

    it("detects root with .vnt/config.json", () => {
      vi.mocked(existsSync).mockImplementation((p: string) => p.includes(".vnt") || p.includes("package.json") || p.includes(".git"));
      vi.mocked(readdirSync).mockReturnValue([]);
      const results = WorkspaceManager.detect("/tmp/project");
      expect(results.some((r) => r.includes("project"))).toBe(true);
    });

    it("detects root with package.json", () => {
      vi.mocked(existsSync).mockImplementation((p: string) => {
        return p.endsWith("package.json") || p.endsWith(".git");
      });
      vi.mocked(readdirSync).mockReturnValue([]);
      const results = WorkspaceManager.detect("/tmp/mono");
      expect(results.some((r) => r.includes("mono"))).toBe(true);
    });

    it("detects subdirectory workspaces", () => {
      vi.mocked(readdirSync).mockReturnValue([
        { name: "pkg-a", isDirectory: () => true } as never,
        { name: "pkg-b", isDirectory: () => true } as never,
        { name: ".hidden", isDirectory: () => true } as never,
        { name: "node_modules", isDirectory: () => true } as never,
        { name: "file.txt", isDirectory: () => false } as never,
      ]);
      // Root check: all markers return false
      // Subdir check: only pkg-a and pkg-b have .git marker
      vi.mocked(existsSync).mockImplementation((p: string) => {
        return p.includes("pkg-a") || p.includes("pkg-b");
      });
      const results = WorkspaceManager.detect("/tmp/mono");
      expect(results.some((r) => r.includes("pkg-a"))).toBe(true);
      expect(results.some((r) => r.includes("pkg-b"))).toBe(true);
      expect(results.some((r) => r.includes("node_modules"))).toBe(false);
    });

    it("handles readdir errors gracefully", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(readdirSync).mockImplementation(() => { throw new Error("permission denied"); });
      const results = WorkspaceManager.detect("/tmp/protected");
      expect(results).toEqual([]);
    });
  });

  describe("workspace properties", () => {
    it("generates deterministic workspace ID", () => {
      wm.add("/tmp/ws");
      const ws = wm.get("/tmp/ws")!;
      expect(ws.id).toMatch(/^ws_[0-9a-f]{8}$/);
    });

    it("sets addedAt timestamp", () => {
      const before = Date.now();
      wm.add("/tmp/ws");
      const ws = wm.get("/tmp/ws")!;
      expect(ws.addedAt).toBeGreaterThanOrEqual(before);
    });
  });
});
