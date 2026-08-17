/**
 * Tree-scoped process termination.
 *
 * `child.kill()` only terminates the direct child; grandchild processes keep
 * running (orphaned). This module kills the whole process tree:
 * - POSIX: child is spawned `detached` (own process group) → `kill(-pid)`
 * - Windows: `taskkill /pid <pid> /T /F`
 *
 * Termination is idempotent: repeated kills for the same pid are no-ops.
 *
 * @module tool/kill-tree
 * @packageDocumentation
 */

import { spawn, type ChildProcess } from "node:child_process";

const terminatedPids = new Set<number>();

/** Clear the idempotency registry (used by tests). */
export function resetKillTreeState(): void {
  terminatedPids.clear();
}

/** True when the process (or its process group) is still alive. */
export function isPidAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

/**
 * Kill a child process and its whole subtree. Idempotent per pid.
 *
 * @param child - The spawned child process.
 * @param signal - POSIX signal for the direct kill (default "SIGTERM").
 *   Windows always uses `taskkill /T /F`.
 * @returns `true` when the kill was issued (or already issued), `false` when
 *   there is no pid yet (child not spawned).
 */
export function killProcessTree(child: ChildProcess, signal: NodeJS.Signals = "SIGTERM"): boolean {
  const pid = child.pid;
  if (!pid || pid <= 0) return false;
  if (terminatedPids.has(pid)) return true;
  terminatedPids.add(pid);

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    }).unref();
    return true;
  }

  // POSIX: the child was spawned detached → kill the whole process group.
  try {
    process.kill(-pid, signal);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ESRCH") {
      // Already gone — group kill is best-effort.
      return true;
    }
    try {
      process.kill(pid, signal);
    } catch {
      // Already gone.
    }
  }
  return true;
}

/**
 * Cross-platform spawn option that makes `killProcessTree` reach the whole
 * tree. On Windows no extra flag is needed (taskkill walks the tree).
 */
export function treeKillSpawnOptions(): { detached: boolean } {
  return { detached: process.platform !== "win32" };
}
