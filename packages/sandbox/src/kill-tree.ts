/**
 * Tree-scoped process termination.
 *
 * `child.kill()` only terminates the direct child; grandchild processes keep
 * running (orphaned). This module kills the whole process tree:
 * - POSIX: child is spawned `detached` (own process group) → `kill(-pid)`
 * - Windows: `taskkill /pid <pid> /T /F`
 *
 * Termination is idempotent: repeated kills for the same pid are no-ops while
 * the kill is still in-flight. The registry is pruned once the tracked process
 * exits (or its TTL elapses) so an OS pid reuse is not silently swallowed.
 *
 * @module sandbox/kill-tree
 * @packageDocumentation
 */

import { spawn, type ChildProcess } from "node:child_process";

const terminatedPids = new Map<number, number>();
const KILL_TTL_MS = 30_000;

/** Clear the idempotency registry (used by tests). */
export function resetKillTreeState(): void {
  terminatedPids.clear();
}

/**
 * Pids currently tracked as "kill already issued".
 *
 * Exposed for observability/tests so a caller can confirm that a terminated
 * pid is no longer held (i.e. it is safe to kill again after reuse).
 */
export function killTreeTrackedPids(): number[] {
  return [...terminatedPids.keys()];
}

/**
 * Prune the idempotency registry: drop pids whose process has exited or whose
 * kill is older than the TTL. Without pruning the registry grows forever and a
 * reused pid is treated as "already killed" — a silent no-op (RV-11).
 *
 * @param now - Clock value to compare the TTL against (injectable for tests).
 */
export function pruneKillTreeState(now: number = Date.now()): void {
  for (const [pid, killedAt] of terminatedPids) {
    if (!isPidAlive(pid) || now - killedAt > KILL_TTL_MS) {
      terminatedPids.delete(pid);
    }
  }
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
 * Kill a child process and its whole subtree. Idempotent per pid while the
 * kill is in-flight (the registry is pruned once the process exits).
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
  pruneKillTreeState();
  if (terminatedPids.has(pid)) return true;
  terminatedPids.set(pid, Date.now());

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
 * Kill a child process and its whole subtree, then await its exit.
 *
 * This is the awaited form of {@link killProcessTree} (RV-11): on Windows the
 * `taskkill /T` spawn is no longer fire-and-forget — the returned promise
 * resolves only after the child has actually exited, or the given timeout
 * elapses.
 *
 * @param child - The spawned child process.
 * @param signal - POSIX signal for the direct kill (default "SIGTERM").
 * @param timeoutMs - How long to wait for the child to exit (default 5000).
 * @returns `true` when the kill was issued (or already issued), `false` when
 *   there is no pid yet (child not spawned).
 */
export function killProcessTreeAndWait(
  child: ChildProcess,
  signal: NodeJS.Signals = "SIGTERM",
  timeoutMs = 5_000,
): Promise<boolean> {
  const issued = killProcessTree(child, signal);
  if (!issued) return Promise.resolve(false);
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(true), timeoutMs);
    const done = (): void => {
      clearTimeout(timer);
      resolve(true);
    };
    child.once("exit", done);
    child.once("error", done);
  });
}

/**
 * Cross-platform spawn option that makes `killProcessTree` reach the whole
 * tree. On Windows no extra flag is needed (taskkill walks the tree).
 */
export function treeKillSpawnOptions(): { detached: boolean } {
  return { detached: process.platform !== "win32" };
}
