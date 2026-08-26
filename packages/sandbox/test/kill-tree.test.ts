import { describe, it, expect, afterEach } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { killProcessTree, killProcessTreeAndWait, killTreeTrackedPids, isPidAlive, pruneKillTreeState, resetKillTreeState, treeKillSpawnOptions } from "../src/kill-tree.js";
import { setTimeout as sleep } from "node:timers/promises";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "killtree-"));

function longRunningScript(): string {
  const file = path.join(tmpDir, `long-${crypto.randomUUID()}.js`);
  fs.writeFileSync(file, "setTimeout(() => {}, 60_000);\n");
  return file;
}

afterEach(() => resetKillTreeState());

describe("killProcessTree", () => {
  it("kills a child and its grandchildren (tree-scoped)", async () => {
    // Parent spawns a grandchild that keeps running; kill the parent → grandchild must die too.
    const gcFile = path.join(tmpDir, `gc-${crypto.randomUUID()}.pid`);
    const gcScript = longRunningScript();
    const child = spawnNodeDetached(
      "const {spawn}=require('node:child_process');const fs=require('node:fs');" +
      `const gc=spawn(process.execPath,['${gcScript.replace(/\\/g, "\\\\")}'],{});` +
      `setTimeout(()=>{fs.writeFileSync(${JSON.stringify(gcFile)},String(gc.pid));},300);` +
      "setTimeout(()=>{}, 60000);",
    );

    // Wait for the grandchild pid file.
    await waitForFile(gcFile);
    const grandchildPid = Number(fs.readFileSync(gcFile, "utf-8").trim());

    const childPid = child.pid!;
    expect(isPidAlive(childPid)).toBe(true);
    expect(grandchildPid).toBeGreaterThan(0);
    expect(isPidAlive(grandchildPid)).toBe(true);

    // Kill the tree.
    expect(killProcessTree(child)).toBe(true);

    // Both should exit.
    await waitUntilGone(childPid);
    await waitUntilGone(grandchildPid);
    expect(isPidAlive(childPid)).toBe(false);
    expect(isPidAlive(grandchildPid)).toBe(false);
  }, 30_000);

  it("is idempotent for the same pid", async () => {
    const script = longRunningScript();
    const child = spawn(process.execPath, [script], { windowsHide: true });
    await sleep(200);
    const pid = child.pid!;
    expect(isPidAlive(pid)).toBe(true);
    expect(killProcessTree(child)).toBe(true);
    // Second call must not throw and still be a no-op.
    expect(() => killProcessTree(child)).not.toThrow();
    expect(killProcessTree(child)).toBe(true);
    await waitUntilGone(pid);
    expect(isPidAlive(pid)).toBe(false);
  }, 15_000);

  it("returns false when there is no pid yet", () => {
    const fake = { pid: undefined } as unknown as ReturnType<typeof spawn>;
    expect(killProcessTree(fake)).toBe(false);
  });

  it("RV-11: prunes dead pids so a reused pid is killable again", async () => {
    const script = longRunningScript();
    const child = spawn(process.execPath, [script], { windowsHide: true });
    await sleep(200);
    const pid = child.pid!;
    expect(killProcessTree(child)).toBe(true);
    await waitUntilGone(pid);

    // The stale entry would turn a recycled pid into a silent no-op — prune it.
    pruneKillTreeState();
    expect(killTreeTrackedPids()).not.toContain(pid);

    // A fresh kill on the same numeric pid must issue again (not be a no-op).
    const reused = { pid } as unknown as ReturnType<typeof spawn>;
    expect(killProcessTree(reused)).toBe(true);
  }, 15_000);

  it("RV-11: prunes entries past the TTL even while the pid is still alive", async () => {
    const script = longRunningScript();
    const child = spawn(process.execPath, [script], { windowsHide: true });
    await sleep(200);
    const pid = child.pid!;
    expect(killProcessTree(child)).toBe(true);
    expect(killTreeTrackedPids()).toContain(pid);

    // Simulate the kill TTL elapsing without waiting 30s.
    pruneKillTreeState(Date.now() + 31_000);
    expect(killTreeTrackedPids()).not.toContain(pid);
  }, 15_000);

  it("RV-11: killProcessTreeAndWait resolves only after the child exits", async () => {
    const script = longRunningScript();
    const child = spawn(process.execPath, [script], { windowsHide: true });
    await sleep(200);
    const pid = child.pid!;
    expect(isPidAlive(pid)).toBe(true);

    const started = Date.now();
    expect(await killProcessTreeAndWait(child)).toBe(true);
    expect(isPidAlive(pid)).toBe(false);
    expect(Date.now() - started).toBeLessThan(10_000);
  }, 20_000);

  it("RV-11: killProcessTreeAndWait tears down grandchildren before resolving", async () => {
    const gcFile = path.join(tmpDir, `gc-${crypto.randomUUID()}.pid`);
    const gcScript = longRunningScript();
    const child = spawnNodeDetached(
      "const {spawn}=require('node:child_process');const fs=require('node:fs');" +
      `const gc=spawn(process.execPath,['${gcScript.replace(/\\/g, "\\\\")}'],{});` +
      `setTimeout(()=>{fs.writeFileSync(${JSON.stringify(gcFile)},String(gc.pid));},300);` +
      "setTimeout(()=>{}, 60000);",
    );

    await waitForFile(gcFile);
    const grandchildPid = Number(fs.readFileSync(gcFile, "utf-8").trim());
    const childPid = child.pid!;

    expect(await killProcessTreeAndWait(child)).toBe(true);
    await waitUntilGone(childPid);
    await waitUntilGone(grandchildPid);
  }, 30_000);
});

describe("treeKillSpawnOptions", () => {
  it("detaches on POSIX, not on Windows", () => {
    expect(treeKillSpawnOptions().detached).toBe(process.platform !== "win32");
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spawnNodeDetached(code: string) {
  return spawn(process.execPath, ["-e", code], {
    detached: process.platform !== "win32",
    windowsHide: true,
    stdio: ["ignore", "ignore", "ignore"],
  });
}

async function waitForFile(file: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return;
    await sleep(50);
  }
  throw new Error(`timed out waiting for ${file}`);
}

async function waitUntilGone(pid: number, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) return;
    await sleep(50);
  }
  throw new Error(`pid ${pid} still alive after ${timeoutMs}ms`);
}