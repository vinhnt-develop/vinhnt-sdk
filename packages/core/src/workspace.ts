import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { WorkspaceId } from "@vinhnt-sdk/schema";

/** A registered workspace directory. */
export interface Workspace {
  readonly id: WorkspaceId;
  readonly root: string;
  readonly name: string;
  readonly addedAt: number;
  isActive: boolean;
}

/** Lifecycle events emitted by {@link WorkspaceManager}. */
export type WorkspaceEventType = "workspace.added" | "workspace.removed" | "workspace.activated" | "workspace.deactivated";

/** Event emitted by {@link WorkspaceManager} on workspace lifecycle changes. */
export interface WorkspaceEvent {
  readonly type: WorkspaceEventType;
  readonly root: string;
  readonly data: Record<string, unknown>;
}

/**
 * Tracks registered workspace directories, manages the single active
 * workspace, and emits lifecycle events to listeners.
 */
export class WorkspaceManager {
  private readonly workspaces = new Map<string, Workspace>();
  private activeRoot: string | null = null;
  private readonly listeners = new Set<(event: WorkspaceEvent) => void>();

  add(root: string): boolean {
    const resolved = resolve(root);
    if (this.workspaces.has(resolved)) return false;
    if (!existsSync(resolved)) return false;

    const name = this.guessName(resolved);
    const id = this.makeWorkspaceId(resolved);
    const workspace: Workspace = {
      id,
      root: resolved,
      name,
      addedAt: Date.now(),
      isActive: false,
    };

    this.workspaces.set(resolved, workspace);
    this.emit({ type: "workspace.added", root: resolved, data: { name } });
    return true;
  }

  remove(root: string): boolean {
    const resolved = resolve(root);
    const removed = this.workspaces.delete(resolved);
    if (removed) {
      if (this.activeRoot === resolved) {
        this.activeRoot = null;
      }
      this.emit({ type: "workspace.removed", root: resolved, data: {} });
    }
    return removed;
  }

  activate(root: string): boolean {
    const resolved = resolve(root);
    if (!this.workspaces.has(resolved)) return false;

    for (const [, ws] of this.workspaces) {
      ws.isActive = false;
    }

    const target = this.workspaces.get(resolved)!;
    target.isActive = true;
    this.activeRoot = resolved;
    this.emit({ type: "workspace.activated", root: resolved, data: { name: target.name } });
    return true;
  }

  deactivate(): void {
    if (this.activeRoot) {
      const ws = this.workspaces.get(this.activeRoot);
      if (ws) ws.isActive = false;
      this.emit({ type: "workspace.deactivated", root: this.activeRoot, data: {} });
      this.activeRoot = null;
    }
  }

  getActive(): Workspace | null {
    if (!this.activeRoot) return null;
    return this.workspaces.get(this.activeRoot) ?? null;
  }

  get(root: string): Workspace | undefined {
    return this.workspaces.get(resolve(root));
  }

  list(): readonly Workspace[] {
    return [...this.workspaces.values()];
  }

  get size(): number {
    return this.workspaces.size;
  }

  onEvent(listener: (event: WorkspaceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  static detect(root: string): string[] {
    const detected: string[] = [];
    const rootDir = resolve(root);

    if (hasWorkspaceMarker(rootDir)) {
      detected.push(rootDir);
    }

    try {
      const entries = readdirSync(rootDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          const subPath = join(rootDir, entry.name);
          if (hasWorkspaceMarker(subPath)) {
            detected.push(subPath);
          }
        }
      }
    } catch {
    }

    return detected;
  }

  private makeWorkspaceId(root: string): WorkspaceId {
    let hash = 0;
    for (let i = 0; i < root.length; i++) {
      const chr = root.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    return `ws_${hex}` as WorkspaceId;
  }

  private guessName(root: string): string {
    try {
      const pkgPath = join(root, "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.name) return pkg.name;
      }
    } catch {
    }
    return root.split(/[/\\]/).pop() ?? root;
  }

  private emit(event: WorkspaceEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch { }
    }
  }
}

function hasWorkspaceMarker(dir: string): boolean {
  return existsSync(join(dir, ".vnt", "config.json")) ||
    existsSync(join(dir, "package.json")) ||
    existsSync(join(dir, ".git"));
}
