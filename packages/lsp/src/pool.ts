import { LspClient } from "./client.js";
import { DiagnosticStore } from "./diagnostics.js";
import { uriFromPath } from "./file-sync.js";
import { findServerByExtension, BUILTIN_SERVERS } from "./server-registry.js";
import type { LspServerDefinition, LspServerStatus, LspPoolConfig, LspDiagnostic } from "./types.js";
import { DEFAULT_LSP_POOL_CONFIG } from "./types.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

interface PoolEntry {
  client: LspClient;
  root: string;
  definition: LspServerDefinition;
  lastUsed: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
  retries: number;
  shuttingDown: boolean;
}

/** Pool of running {@link LspClient}s keyed by server+root with idle eviction. */
export class LspPool {
  private entries = new Map<string, PoolEntry>();
  private broken = new Set<string>();
  private spawning = new Map<string, Promise<LspClient>>();
  readonly diagnostics = new DiagnosticStore();
  private config: LspPoolConfig;
  private workspaceRoots = new Set<string>();
  private customServers = new Map<string, LspServerDefinition>();

  constructor(config?: Partial<LspPoolConfig>) {
    this.config = { ...DEFAULT_LSP_POOL_CONFIG, ...config };
  }

  /**
   * Register custom LSP server definitions from user config.
   * Accepts a record keyed by server ID with partial LspServerDefinition fields.
   * Custom servers take priority over built-in servers for matching extensions.
   */
  registerCustomServers(servers: Record<string, Partial<LspServerDefinition>>): void {
    for (const [id, cfg] of Object.entries(servers)) {
      if (!cfg || !cfg.extensions || !cfg.command) continue;
      const def: LspServerDefinition = {
        id,
        name: cfg.name ?? id,
        languageId: cfg.languageId ?? id,
        extensions: cfg.extensions,
        command: cfg.command,
        args: cfg.args ?? [],
        rootFiles: cfg.rootFiles ?? [],
        ...(cfg.env !== undefined ? { env: cfg.env } : {}),
        ...(cfg.initializationOptions !== undefined ? { initializationOptions: cfg.initializationOptions } : {}),
      };
      for (const ext of def.extensions) {
        this.customServers.set(ext, def);
      }
    }
  }

  /**
   * Replace all custom server definitions (config hot-reload). Any previously
   * registered custom servers are dropped, then the new set is registered.
   */
  applyCustomServers(servers: Record<string, Partial<LspServerDefinition>>): void {
    this.customServers.clear();
    this.registerCustomServers(servers);
  }

  /* ── Multi-workspace ── */

  /** Register workspace roots for explicit root resolution */
  setActiveRoots(roots: string[]): void {
    this.workspaceRoots.clear();
    for (const r of roots) this.workspaceRoots.add(r);
  }

  /** Start LSP for a specific workspace root (pre-warms) */
  async warmWorkspace(root: string): Promise<void> {
    try {
      const entries = fs.readdirSync(root, { withFileTypes: true });
      const promises: Promise<unknown>[] = [];
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (ext && ext !== ".json") {
            promises.push(
              this.getOrStart(path.join(root, entry.name)).catch(() => {})
            );
          }
        }
      }
      await Promise.all(promises);
    } catch {
      // Ignore read errors
    }
  }

  /** Shutdown all LSP servers rooted at a specific workspace */
  async shutdownRoot(root: string): Promise<void> {
    const resolved = path.resolve(root);
    const toRemove: string[] = [];
    for (const [key, entry] of this.entries) {
      if (path.resolve(entry.root) === resolved) {
        toRemove.push(key);
      }
    }
    await Promise.all(toRemove.map(async (key) => {
      const entry = this.entries.get(key);
      if (!entry) return;
      if (entry.idleTimer) clearTimeout(entry.idleTimer);
      try { await entry.client.shutdown(); } catch { /* ignore */ }
      this.entries.delete(key);
      this.broken.delete(key);
    }));
    this.diagnostics.clearAll();
  }

  /* ── Public API ── */

  async getOrStart(filePath: string): Promise<LspClient | null> {
    const definition = this.findDefinition(this.getExtension(filePath));
    if (!definition) return null;

    const root = this.resolveRoot(filePath, definition);
    if (!root) return null;

    const key = this.makeKey(definition.id, root);
    if (this.broken.has(key)) return null;

    const existing = this.entries.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      this.resetIdleTimer(existing);
      return existing.client;
    }

    const inFlight = this.spawning.get(key);
    if (inFlight) return inFlight;

    const spawnPromise = this.spawn(definition, root, key);
    this.spawning.set(key, spawnPromise);

    try {
      const client = await spawnPromise;
      return client;
    } finally {
      this.spawning.delete(key);
    }
  }

  /** Like getOrStart but with an explicit workspace root */
  async getOrStartForWorkspace(filePath: string, workspaceRoot: string): Promise<LspClient | null> {
    const definition = this.findDefinition(this.getExtension(filePath));
    if (!definition) return null;

    const root = path.resolve(workspaceRoot);
    const key = this.makeKey(definition.id, root);
    if (this.broken.has(key)) return null;

    const existing = this.entries.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      this.resetIdleTimer(existing);
      return existing.client;
    }

    const inFlight = this.spawning.get(key);
    if (inFlight) return inFlight;

    const spawnPromise = this.spawn(definition, root, key);
    this.spawning.set(key, spawnPromise);

    try {
      const client = await spawnPromise;
      return client;
    } finally {
      this.spawning.delete(key);
    }
  }

  async getDiagnostics(filePath: string): Promise<LspDiagnostic[]> {
    const uri = uriFromPath(filePath);
    const stored = this.diagnostics.get(uri);
    if (stored) return stored.diagnostics;
    return [];
  }

  async waitAndGetDiagnostics(filePath: string, sinceVersion = 0): Promise<LspDiagnostic[]> {
    const uri = uriFromPath(filePath);
    return this.diagnostics.waitForDiagnostics(uri, this.config.waitDiagnosticsMs, sinceVersion);
  }

  /** Current diagnostic version for a file (0 when unknown/never updated) */
  diagnosticsVersion(filePath: string): number {
    return this.diagnostics.version(uriFromPath(filePath));
  }

  touchFile(filePath: string, content: string): void {
    const client = this.findClientForFile(filePath);
    if (!client) return;

    const uri = uriFromPath(filePath);
    const existing = this.diagnostics.get(uri);
    if (existing) {
      client.changeFile(uri, content);
    } else {
      const ext = this.getExtension(filePath);
      const def = this.findDefinition(ext);
      client.openFile(uri, def?.languageId ?? "plaintext", content);
    }
  }

  closeFile(filePath: string): void {
    const client = this.findClientForFile(filePath);
    if (!client) return;
    const uri = uriFromPath(filePath);
    client.closeFile(uri);
    this.diagnostics.clear(uri);
  }

  /** Find a running client by server ID, optionally matching a file path's root */
  getClient(serverId: string, filePath?: string): LspClient | null {
    if (filePath) {
      const absPath = path.resolve(filePath);
      for (const [, entry] of this.entries) {
        if (entry.definition.id === serverId && absPath.startsWith(path.resolve(entry.root))) {
          entry.lastUsed = Date.now();
          this.resetIdleTimer(entry);
          return entry.client;
        }
      }
    }
    for (const [, entry] of this.entries) {
      if (entry.definition.id === serverId) {
        entry.lastUsed = Date.now();
        this.resetIdleTimer(entry);
        return entry.client;
      }
    }
    return null;
  }

  getStatus(): LspServerStatus[] {
    const statuses: LspServerStatus[] = [];
    for (const [, entry] of this.entries) {
      statuses.push({
        id: entry.definition.id,
        root: entry.root,
        languageId: entry.definition.languageId,
        connected: entry.client.connected,
        since: entry.client.spawnedAt,
      });
    }
    return statuses;
  }

  async shutdownAll(): Promise<void> {
    for (const [, entry] of this.entries) {
      if (entry.idleTimer) clearTimeout(entry.idleTimer);
      try {
        await entry.client.shutdown();
      } catch { /* ignore */ }
    }
    this.entries.clear();
    this.broken.clear();
    this.diagnostics.clearAll();
  }

  /* ── Auto-install ── */

  /** Detect which language servers are missing from PATH */
  async detectMissing(): Promise<LspServerDefinition[]> {
    const missing: LspServerDefinition[] = [];
    for (const def of BUILTIN_SERVERS) {
      if (!def.autoInstall) continue;
      try {
        const whichCmd = process.platform === "win32" ? "where" : "which";
        execSync(`${whichCmd} ${def.command}`, { stdio: "ignore" });
      } catch {
        missing.push(def);
      }
    }
    return missing;
  }

  /** Attempt auto-install of a server via its autoInstall script */
  async autoInstall(def: LspServerDefinition): Promise<boolean> {
    if (!def.autoInstall) return false;
    try {
      execSync(def.autoInstall, { stdio: "pipe", timeout: 120_000 });
      return true;
    } catch {
      return false;
    }
  }

  /** Try to auto-install all missing servers */
  async autoInstallMissing(): Promise<{ success: string[]; failed: string[] }> {
    const missing = await this.detectMissing();
    const success: string[] = [];
    const failed: string[] = [];
    for (const def of missing) {
      const ok = await this.autoInstall(def);
      if (ok) success.push(def.id);
      else failed.push(def.id);
    }
    return { success, failed };
  }

  /* ── Private ── */

  private async spawn(definition: LspServerDefinition, root: string, key: string): Promise<LspClient> {
    const client = new LspClient(definition, root, this.config.initTimeoutMs, {
      onDiagnostics: (uri, diagnostics) => {
        this.diagnostics.set(uri, diagnostics);
      },
      onError: (err) => {
        console.warn(`[LSP ${definition.id}] ${err.message}`);
      },
      onExit: (code, signal) => {
        this.entries.delete(key);
        if (code !== 0 && signal !== "SIGKILL") {
          this.broken.add(key);
        }
      },
    });

    try {
      await client.start();
    } catch (err) {
      const entry = this.entries.get(key);
      if (entry) {
        entry.retries++;
        if (entry.retries >= this.config.maxRetries) {
          this.broken.add(key);
          this.entries.delete(key);
        }
      }
      throw err;
    }

    const entry: PoolEntry = {
      client,
      root,
      definition,
      lastUsed: Date.now(),
      idleTimer: null,
      retries: 0,
      shuttingDown: false,
    };
    this.entries.set(key, entry);
    this.resetIdleTimer(entry);

    return client;
  }

  private resetIdleTimer(entry: PoolEntry): void {
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => {
      if (entry.shuttingDown) return;
      entry.shuttingDown = true;
      const key = this.makeKey(entry.definition.id, entry.root);
      if (this.entries.get(key) !== entry) return; // entry was replaced since timer was set
      entry.client.shutdown().catch(() => {});
      this.entries.delete(key);
      this.diagnostics.clearAll();
    }, this.config.idleTimeoutMs);
  }

  private findClientForFile(filePath: string): LspClient | null {
    const ext = this.getExtension(filePath);
    const definition = this.findDefinition(ext);
    if (!definition) return null;

    const root = this.resolveRoot(filePath, definition);
    if (!root) return null;

    const key = this.makeKey(definition.id, root);
    const entry = this.entries.get(key);
    return entry?.client ?? null;
  }

  /**
   * Resolve root for a file. Checks:
   * 1. Registered workspace roots (explicit match)
   * 2. Auto-detect via rootFiles markers (original behavior)
   */
  private resolveRoot(filePath: string, definition: LspServerDefinition): string | null {
    // Check workspace roots first
    const fileDir = path.dirname(filePath);
    if (this.workspaceRoots.size > 0) {
      for (const wr of this.workspaceRoots) {
        const resolved = path.resolve(wr);
        if (fileDir.startsWith(resolved)) {
          return resolved;
        }
      }
    }
    // Fall back to marker-based detection
    return this.findRootByMarkers(filePath, definition);
  }

  private findRootByMarkers(filePath: string, definition: LspServerDefinition): string | null {
    let dir = path.dirname(filePath);
    const markers = definition.rootFiles;

    while (true) {
      for (const marker of markers) {
        const markerPath = path.join(dir, marker);
        if (fs.existsSync(markerPath)) {
          return dir;
        }
      }
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }

  /** Look up server definition: custom servers take priority over built-in */
  private findDefinition(ext: string): LspServerDefinition | undefined {
    return this.customServers.get(ext) ?? findServerByExtension(ext);
  }

  private getExtension(filePath: string): string {
    const basename = path.basename(filePath);
    // Handle special filenames like "Dockerfile" (no extension)
    if (basename === "Dockerfile" || basename === "dockerfile") return "Dockerfile";
    return path.extname(filePath);
  }

  private makeKey(serverId: string, root: string): string {
    return `${serverId}::${root}`;
  }
}
