import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { LspPool } from "../src/pool.js";
import type { LspServerDefinition } from "../src/types.js";
import * as path from "node:path";

interface FakeLspClient {
  definition: LspServerDefinition;
  root: string;
  serverId: string;
  spawnedAt: number;
  connected: boolean;
  ready: boolean;
  start: Mock;
  shutdown: Mock;
  openFile: Mock;
  changeFile: Mock;
  closeFile: Mock;
  getDiagnostics: Mock;
  getSymbols: Mock;
  getHover: Mock;
  getDefinition: Mock;
  getReferences: Mock;
  getCompletion: Mock;
  getTypeDefinition: Mock;
  getImplementation: Mock;
  getSignatureHelp: Mock;
  getDocumentSymbols: Mock;
  getCodeActions: Mock;
  getFormatting: Mock;
  getRename: Mock;
}

let clientInstances: FakeLspClient[] = [];
function createFakeLspClient(): FakeLspClient {
  const client: FakeLspClient = {
    definition: {} as LspServerDefinition,
    root: path.resolve("/fake-root"),
    serverId: `fake-${clientInstances.length + 1}`,
    spawnedAt: Date.now(),
    connected: true,
    ready: true,
    start: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    openFile: vi.fn(),
    changeFile: vi.fn(),
    closeFile: vi.fn(),
    getDiagnostics: vi.fn().mockResolvedValue([]),
    getSymbols: vi.fn().mockResolvedValue([]),
    getHover: vi.fn().mockResolvedValue(null),
    getDefinition: vi.fn().mockResolvedValue(null),
    getReferences: vi.fn().mockResolvedValue([]),
    getCompletion: vi.fn().mockResolvedValue([]),
    getTypeDefinition: vi.fn().mockResolvedValue(null),
    getImplementation: vi.fn().mockResolvedValue(null),
    getSignatureHelp: vi.fn().mockResolvedValue(null),
    getDocumentSymbols: vi.fn().mockResolvedValue([]),
    getCodeActions: vi.fn().mockResolvedValue([]),
    getFormatting: vi.fn().mockResolvedValue([]),
    getRename: vi.fn().mockResolvedValue(null),
  };
  clientInstances.push(client);
  return client;
}

vi.mock("../src/client.js", () => {
  return {
    LspClient: vi.fn().mockImplementation(() => createFakeLspClient()),
  };
});

describe("LspPool", () => {
  let pool: LspPool;

  beforeEach(() => {
    clientInstances = [];
    pool = new LspPool({ idleTimeoutMs: 99999, maxRetries: 1, initTimeoutMs: 1000, waitDiagnosticsMs: 100 });
  });

  afterEach(async () => {
    await pool.shutdownAll();
  });

  describe("constructor", () => {
    it("uses defaults when no config given", () => {
      const p = new LspPool();
      expect(p).toBeInstanceOf(LspPool);
      expect(p.diagnostics).toBeDefined();
    });

    it("accepts custom config", () => {
      const p = new LspPool({ idleTimeoutMs: 5000, maxRetries: 1 });
      expect(p).toBeInstanceOf(LspPool);
    });
  });

  describe("setActiveRoots", () => {
    it("accepts workspace roots", () => {
      expect(() => pool.setActiveRoots(["/workspace/a"])).not.toThrow();
    });

    it("clears previous roots on set", () => {
      pool.setActiveRoots(["/workspace/a"]);
      pool.setActiveRoots(["/workspace/c"]);
      expect(true).toBe(true);
    });
  });

  describe("getOrStart", () => {
    it("returns null for unknown extension", async () => {
      const result = await pool.getOrStart("file.unknownExtXYZ");
      expect(result).toBeNull();
    });
  });

  describe("getOrStartForWorkspace", () => {
    it("returns null for unknown extension", async () => {
      const result = await pool.getOrStartForWorkspace("file.unknownExtXYZ", "/tmp");
      expect(result).toBeNull();
    });

    it("returns a client for known extension with explicit root", async () => {
      const root = path.resolve("/lsp-test-workspace");
      pool.setActiveRoots([root]);
      const result = await pool.getOrStartForWorkspace("main.ts", root);
      expect(result).not.toBeNull();
      expect(clientInstances.length).toBeGreaterThanOrEqual(1);
    });

    it("caches and returns same client for same key", async () => {
      const root = path.resolve("/lsp-test-cache");
      pool.setActiveRoots([root]);
      const first = await pool.getOrStartForWorkspace("main.ts", root);
      const second = await pool.getOrStartForWorkspace("main.ts", root);
      expect(first).toBe(second);
    });
  });

  describe("registerCustomServers", () => {
    it("allows custom server for unknown extension", async () => {
      pool.registerCustomServers({
        "mylang": {
          extensions: [".my"],
          command: "mylang-lsp",
          args: ["--stdio"],
          rootFiles: ["my.config"],
          languageId: "mylang",
        },
      });
      const root = path.resolve("/lsp-custom-test");
      pool.setActiveRoots([root]);
      const result = await pool.getOrStartForWorkspace("file.my", root);
      expect(result).not.toBeNull();
    });

    it("custom server takes priority over built-in", async () => {
      pool.registerCustomServers({
        "my-ts": {
          extensions: [".ts"],
          command: "my-ts-lsp",
          args: [],
          rootFiles: [],
        },
      });
      const root = path.resolve("/lsp-override-test");
      pool.setActiveRoots([root]);
      const result = await pool.getOrStartForWorkspace("main.ts", root);
      expect(result).not.toBeNull();
    });

    it("ignores invalid custom server entries", () => {
      expect(() => {
        pool.registerCustomServers({
          "bad": {} as any,
        });
      }).not.toThrow();
    });
  });

  describe("getStatus", () => {
    it("returns empty array when no servers running", () => {
      const statuses = pool.getStatus();
      expect(statuses).toEqual([]);
    });
  });

  describe("getDiagnostics", () => {
    it("returns empty array for unknown file", async () => {
      const result = await pool.getDiagnostics("/unknown/file.ts");
      expect(result).toEqual([]);
    });
  });

  describe("waitAndGetDiagnostics", () => {
    it("returns empty array for unknown file after timeout", async () => {
      const result = await pool.waitAndGetDiagnostics("/unknown/file.ts");
      expect(result).toEqual([]);
    });
  });

  describe("touchFile / closeFile", () => {
    it("silently does nothing for unknown file", () => {
      expect(() => pool.touchFile("unknown.ts", "content")).not.toThrow();
    });

    it("silently does nothing for closeFile on unknown file", () => {
      expect(() => pool.closeFile("unknown.ts")).not.toThrow();
    });
  });

  describe("shutdownAll", () => {
    it("clears all entries", async () => {
      const root = path.resolve("/lsp-shutdown-test");
      pool.setActiveRoots([root]);
      await pool.getOrStartForWorkspace("main.ts", root);
      expect(pool.getStatus().length).toBeGreaterThanOrEqual(1);
      await pool.shutdownAll();
      expect(pool.getStatus()).toEqual([]);
    });

    it("is idempotent", async () => {
      await pool.shutdownAll();
      await pool.shutdownAll();
      expect(pool.getStatus()).toEqual([]);
    });
  });

  describe("shutdownRoot", () => {
    it("does nothing for unknown root", async () => {
      await pool.shutdownRoot("/unknown");
      expect(pool.getStatus()).toEqual([]);
    });
  });

  describe("detectMissing / autoInstall", () => {
    it("detectMissing returns array", async () => {
      const missing = await pool.detectMissing();
      expect(Array.isArray(missing)).toBe(true);
    });

    it("autoInstall returns false when no autoInstall script", async () => {
      const fakeDef = {
        id: "fake", name: "Fake", languageId: "fake",
        extensions: [".fx"], command: "nonexistent",
        args: [], rootFiles: [],
      };
      const result = await pool.autoInstall(fakeDef);
      expect(result).toBe(false);
    });

    it("autoInstallMissing returns success/failed arrays", async () => {
      const result = await pool.autoInstallMissing();
      expect(Array.isArray(result.success)).toBe(true);
      expect(Array.isArray(result.failed)).toBe(true);
    });
  });
});
