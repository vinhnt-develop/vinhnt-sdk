import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createConfigWatcher } from "../src/config-watcher.js";

describe("ConfigWatcher", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "vnt-config-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("watchedFiles returns existing config files", () => {
    writeFileSync(join(tmpDir, "vnt.json"), JSON.stringify({ defaultProvider: "anthropic" }));
    const watcher = createConfigWatcher({ projectDir: tmpDir });
    expect(watcher.watchedFiles).toContain(join(tmpDir, "vnt.json"));
    watcher.close();
  });

  it("returns empty watchedFiles when no config files exist", () => {
    const watcher = createConfigWatcher({ projectDir: tmpDir });
    expect(watcher.watchedFiles.length).toBe(0);
    watcher.close();
  });

  it("fires onDidChange when config file is modified", async () => {
    const configPath = join(tmpDir, "vnt.json");
    writeFileSync(configPath, JSON.stringify({ defaultProvider: "openai" }));

    const watcher = createConfigWatcher({ projectDir: tmpDir, debounceMs: 50 });
    const changes: string[] = [];
    watcher.onDidChange((file) => changes.push(file));

    await new Promise((r) => setTimeout(r, 100));
    writeFileSync(configPath, JSON.stringify({ defaultProvider: "anthropic" }));

    await new Promise((r) => setTimeout(r, 200));
    expect(changes.length).toBeGreaterThanOrEqual(1);
    expect(changes.some((f) => f.includes("vnt.json"))).toBe(true);
    watcher.close();
  });

  it("onDidChange returns unsubscribe function", () => {
    writeFileSync(join(tmpDir, "vnt.json"), JSON.stringify({ defaultProvider: "openai" }));
    const watcher = createConfigWatcher({ projectDir: tmpDir });
    const fn = () => {};
    const unsub = watcher.onDidChange(fn);
    expect(typeof unsub).toBe("function");
    watcher.close();
  });

  it("close stops all watchers and no more events fire", async () => {
    const configPath = join(tmpDir, "vnt.json");
    writeFileSync(configPath, JSON.stringify({ defaultProvider: "openai" }));
    const watcher = createConfigWatcher({ projectDir: tmpDir, debounceMs: 50 });
    const changes: string[] = [];
    watcher.onDidChange((file) => changes.push(file));

    // Write initial file and wait for any startup events
    await new Promise((r) => setTimeout(r, 100));
    changes.length = 0;

    watcher.close();
    writeFileSync(configPath, JSON.stringify({ defaultProvider: "anthropic" }));
    await new Promise((r) => setTimeout(r, 200));
    expect(changes.length).toBe(0);
  });
});
