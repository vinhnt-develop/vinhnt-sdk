import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolve } from "node:path";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:module", () => ({
  createRequire: vi.fn(),
}));

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { loadPluginFromNpm, loadNpmPlugins, clearPluginCache } from "../src/npm-loader.js";

function createMockPlugin(overrides: Record<string, unknown> = {}) {
  return {
    manifest: { id: "test-plugin", name: "Test Plugin", version: "1.0.0", ...overrides },
    hooks: {},
    activate: vi.fn(),
    deactivate: vi.fn(),
  };
}

function mockExecFileSuccess(stdout = "installed") {
  vi.mocked(execFile).mockImplementation(((_cmd, _args, _opts, cb) => {
    if (typeof cb === "function") cb(null, stdout);
  }) as never);
}

function mockExecFileError(message: string) {
  vi.mocked(execFile).mockImplementation(((_cmd, _args, _opts, cb) => {
    if (typeof cb === "function") cb(new Error(message), "");
  }) as never);
}

describe("loadPluginFromNpm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("installs package when not cached", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    mockExecFileSuccess();
    vi.mocked(createRequire).mockReturnValue(() => createMockPlugin());

    const plugin = await loadPluginFromNpm("test-plugin");

    expect(execFile).toHaveBeenCalledWith(
      "npm",
      ["install", "test-plugin", "--save", "--no-audit", "--no-fund"],
      expect.objectContaining({ cwd: expect.any(String), timeout: expect.any(Number) }),
      expect.any(Function),
    );
    expect(writeFile).toHaveBeenCalled();
    expect(plugin.manifest.id).toBe("test-plugin");
  });

  it("skips install when cache marker exists", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(createRequire).mockReturnValue(() => createMockPlugin());

    const plugin = await loadPluginFromNpm("test-plugin");

    expect(execFile).not.toHaveBeenCalled();
    expect(plugin.manifest.id).toBe("test-plugin");
  });

  it("uses custom cacheDir when provided", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(createRequire).mockReturnValue(() => createMockPlugin());

    await loadPluginFromNpm("my-plugin", { cacheDir: "/custom/cache" });

    const reqPath = vi.mocked(createRequire).mock.calls[0]?.[0] as string;
    expect(reqPath).toMatch(/[/\\]custom[/\\]cache/);
  });

  it("throws when package does not export a valid plugin", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(createRequire).mockReturnValue(() => ({ notAPlugin: true } as never));

    await expect(loadPluginFromNpm("bad-package")).rejects.toThrow("not a valid Plugin");
  });

  it("throws when npm install fails", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    mockExecFileError("npm ERR! network timeout");

    await expect(loadPluginFromNpm("broken-pkg")).rejects.toThrow("npm install failed");
  });

  it("creates package.json in cache dir before install", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    mockExecFileSuccess();
    vi.mocked(createRequire).mockReturnValue(() => createMockPlugin());

    await loadPluginFromNpm("fresh-pkg");

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining("package.json"),
      expect.stringContaining("vnt-plugin-cache"),
      "utf-8",
    );
  });

  it("handles package with version specifier", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(createRequire).mockReturnValue(() => createMockPlugin());

    const plugin = await loadPluginFromNpm("test-plugin@^2.0");

    expect(plugin.manifest.id).toBe("test-plugin");
  });

  it("loads default export from ESM package", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const mockPlugin = createMockPlugin();
    vi.mocked(createRequire).mockReturnValue(() => ({ default: mockPlugin }));

    const plugin = await loadPluginFromNpm("esm-plugin");

    expect(plugin.manifest.id).toBe("test-plugin");
  });

  it("handles non-object module export gracefully", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(createRequire).mockReturnValue(() => null as never);

    await expect(loadPluginFromNpm("null-export")).rejects.toThrow("did not export a valid plugin");
  });
});

describe("loadNpmPlugins", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads and registers multiple plugins", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const pluginA = createMockPlugin({ id: "plugin-a" });
    const pluginB = createMockPlugin({ id: "plugin-b" });
    vi.mocked(createRequire)
      .mockReturnValueOnce(() => pluginA)
      .mockReturnValueOnce(() => pluginB);

    const register = vi.fn();
    const activate = vi.fn();

    await loadNpmPlugins(["pkg-a", "pkg-b"], { register, activate });

    expect(register).toHaveBeenCalledTimes(2);
    expect(register).toHaveBeenCalledWith(pluginA);
    expect(register).toHaveBeenCalledWith(pluginB);
    expect(activate).toHaveBeenCalledTimes(2);
    expect(activate).toHaveBeenCalledWith("plugin-a");
    expect(activate).toHaveBeenCalledWith("plugin-b");
  });

  it("handles individual plugin load failure without stopping others", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const goodPlugin = createMockPlugin({ id: "good" });
    vi.mocked(createRequire)
      .mockReturnValueOnce(() => null as never)
      .mockReturnValueOnce(() => goodPlugin);

    const register = vi.fn();
    const activate = vi.fn();

    await loadNpmPlugins(["bad-pkg", "good-pkg"], { register, activate });

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(goodPlugin);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledWith("good");
  });

  it("handles empty package names list", async () => {
    const register = vi.fn();
    const activate = vi.fn();

    await loadNpmPlugins([], { register, activate });

    expect(register).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
  });
});

describe("clearPluginCache", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("removes cache directory when it exists", async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    await clearPluginCache();

    expect(rm).toHaveBeenCalledWith(
      expect.stringContaining(".vnt"),
      { recursive: true, force: true },
    );
  });

  it("does nothing when cache directory does not exist", async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    await clearPluginCache();

    expect(rm).not.toHaveBeenCalled();
  });

  it("uses custom cacheDir when provided", async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const customDir = resolve("/custom/cache");

    await clearPluginCache("/custom/cache");

    expect(rm).toHaveBeenCalledWith(customDir, { recursive: true, force: true });
  });
});
