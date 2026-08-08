import { execFile } from "node:child_process";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Plugin } from "@vinhnt-sdk/core";

const CACHE_DIR = ".vnt/plugins";

/**
 * Package manager interface — user tự implement cho npm, pnpm, yarn, bun.
 */
export interface PackageManager {
  /** Install a package */
  install(spec: string, cwd: string): Promise<void>;
  /** Uninstall a package */
  uninstall(spec: string, cwd: string): Promise<void>;
}

/**
 * Default npm package manager — convenience only.
 */
export class NpmPackageManager implements PackageManager {
  async install(spec: string, cwd: string): Promise<void> {
    await execAsync("npm", ["install", spec, "--save", "--no-audit", "--no-fund"], cwd);
  }

  async uninstall(spec: string, cwd: string): Promise<void> {
    await execAsync("npm", ["uninstall", spec], cwd);
  }
}

/**
 * pnpm package manager — convenience only.
 */
export class PnpmPackageManager implements PackageManager {
  async install(spec: string, cwd: string): Promise<void> {
    await execAsync("pnpm", ["add", spec], cwd);
  }

  async uninstall(spec: string, cwd: string): Promise<void> {
    await execAsync("pnpm", ["remove", spec], cwd);
  }
}

/**
 * yarn package manager — convenience only.
 */
export class YarnPackageManager implements PackageManager {
  async install(spec: string, cwd: string): Promise<void> {
    await execAsync("yarn", ["add", spec], cwd);
  }

  async uninstall(spec: string, cwd: string): Promise<void> {
    await execAsync("yarn", ["remove", spec], cwd);
  }
}

export interface NpmPluginLoaderOptions {
  cacheDir?: string;
  /** List of allowed package names. If provided, only these packages can be loaded. */
  allowedPlugins?: string[];
  /** Known good hashes for package.json files (package-name → sha256 hash). */
  knownHashes?: Record<string, string>;
  /** If true, log all plugin load attempts to console for audit. */
  auditLog?: boolean;
  /** Package manager for installing plugins (default: npm) */
  packageManager?: PackageManager;
}

/** Plugin audit log entry */
export interface PluginAuditEntry {
  timestamp: number;
  packageName: string;
  action: "load" | "allowlist-block" | "hash-mismatch" | "load-error";
  details?: string;
}

/** In-memory audit log (can be persisted by consumer) */
const pluginAuditLog: PluginAuditEntry[] = [];

/** Get the audit log (for external consumers to read/persist) */
export function getPluginAuditLog(): readonly PluginAuditEntry[] {
  return pluginAuditLog;
}

/** Clear the audit log */
export function clearPluginAuditLog(): void {
  pluginAuditLog.length = 0;
}

function logAudit(entry: PluginAuditEntry): void {
  pluginAuditLog.push(entry);
}

function execAsync(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(new Error(`npm install failed: ${err.message}\n${stdout}`));
      else resolve(stdout);
    });
  });
}

/** Parse package@version into name and version parts */
function parsePackageSpec(spec: string): { name: string; version: string | null } {
  const atIndex = spec.indexOf("@");
  if (atIndex <= 0) return { name: spec, version: null };
  // Scoped package: @scope/pkg@version — find second @
  if (spec.startsWith("@")) {
    const secondAtIndex = spec.indexOf("@", 1);
    if (secondAtIndex > 0) {
      return { name: spec.slice(0, secondAtIndex), version: spec.slice(secondAtIndex + 1) || null };
    }
    return { name: spec, version: null };
  }
  return { name: spec.slice(0, atIndex), version: spec.slice(atIndex + 1) || null };
}

/**
 * Install an npm package into the plugin cache and load its default export.
 *
 * Security checks (when options provided):
 * 1. Allowlist — only packages in `allowedPlugins` can be loaded
 * 2. Hash verification — package.json hash must match `knownHashes`
 * 3. Audit logging — all attempts are logged
 */
export async function loadPluginFromNpm(
  packageName: string,
  options?: NpmPluginLoaderOptions,
): Promise<Plugin> {
  const { name: pkgName, version } = parsePackageSpec(packageName);

  // --- Allowlist check ---
  if (options?.allowedPlugins && options.allowedPlugins.length > 0) {
    if (!options.allowedPlugins.includes(pkgName)) {
      const entry: PluginAuditEntry = {
        timestamp: Date.now(),
        packageName: pkgName,
        action: "allowlist-block",
        details: `Package "${pkgName}" is not in the allowed plugins list`,
      };
      logAudit(entry);
      if (options.auditLog) {
        console.warn(`[plugin-audit] BLOCKED: ${pkgName} — not in allowlist`);
      }
      throw new Error(`Plugin "${pkgName}" is not in the allowed plugins list`);
    }
  }

  const cacheDir = resolve(options?.cacheDir ?? CACHE_DIR);
  const installSpec = version ? `${pkgName}@${version}` : pkgName;
  // Cache key includes version to bust cache when version changes
  const cacheKey = version ? `${pkgName}/${version}` : pkgName;
  const pkgDir = join(cacheDir, "node_modules", pkgName);
  const cacheMarker = join(cacheDir, `.cache-${cacheKey.replace(/[^a-zA-Z0-9_@.-]/g, "_")}`);

  if (!existsSync(cacheMarker)) {
    await mkdir(cacheDir, { recursive: true });
    const pkgJson = join(cacheDir, "package.json");
    if (!existsSync(pkgJson)) {
      await writeFile(pkgJson, JSON.stringify({ private: true, name: "vnt-plugin-cache" }), "utf-8");
    }
    if (options?.auditLog) {
      console.log(`[plugin-audit] INSTALL: ${installSpec}`);
    }
    console.log(`[plugin] Installing npm plugin: ${installSpec}`);

    // Use injected package manager or default to npm
    const pm = options?.packageManager ?? new NpmPackageManager();
    await pm.install(installSpec, cacheDir);

    await writeFile(cacheMarker, Date.now().toString(), "utf-8");
    console.log(`[plugin] Installed: ${installSpec}`);
  }

  // --- Hash verification ---
  const pkgJsonPath = join(pkgDir, "package.json");
  if (options?.knownHashes && options.knownHashes[pkgName]) {
    try {
      const pkgContent = await readFile(pkgJsonPath, "utf-8");
      const actualHash = createHash("sha256").update(pkgContent).digest("hex");
      const expectedHash = options.knownHashes[pkgName];

      if (actualHash !== expectedHash) {
        const entry: PluginAuditEntry = {
          timestamp: Date.now(),
          packageName: pkgName,
          action: "hash-mismatch",
          details: `Expected ${expectedHash}, got ${actualHash}`,
        };
        logAudit(entry);
        if (options.auditLog) {
          console.warn(`[plugin-audit] HASH MISMATCH: ${pkgName} — expected ${expectedHash}, got ${actualHash}`);
        }
        throw new Error(
          `Plugin "${pkgName}" package.json hash mismatch — expected ${expectedHash}, got ${actualHash}. ` +
          `This may indicate tampering.`
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("hash mismatch")) throw err;
      // If we can't read the file, continue (will fail on require anyway)
    }
  }

  const localRequire = createRequire(pkgJsonPath);
  const mod = localRequire(pkgDir);
  if (!mod || typeof mod !== "object") {
    const entry: PluginAuditEntry = {
      timestamp: Date.now(),
      packageName: pkgName,
      action: "load-error",
      details: "Invalid module export",
    };
    logAudit(entry);
    throw new Error(`Plugin package "${packageName}" did not export a valid plugin`);
  }
  const defaultExport = "default" in mod ? mod.default : mod;
  if (!defaultExport || typeof defaultExport !== "object" || !("manifest" in defaultExport)) {
    const entry: PluginAuditEntry = {
      timestamp: Date.now(),
      packageName: pkgName,
      action: "load-error",
      details: "Missing manifest in default export",
    };
    logAudit(entry);
    throw new Error(`Plugin package "${packageName}" default export is not a valid Plugin object (missing manifest)`);
  }

  // --- Audit log success ---
  const entry: PluginAuditEntry = {
    timestamp: Date.now(),
    packageName: pkgName,
    action: "load",
    details: `Loaded ${(defaultExport as Plugin).manifest?.id ?? "unknown"}@${(defaultExport as Plugin).manifest?.version ?? "?"}`,
  };
  logAudit(entry);
  if (options?.auditLog) {
    console.log(`[plugin-audit] LOADED: ${pkgName} (${entry.details})`);
  }

  return defaultExport as unknown as Plugin;
}

/** Load all npm plugins from config in parallel */
export async function loadNpmPlugins(
  packageNames: string[],
  pluginManager: { register(plugin: Plugin): Promise<void>; activate(id: string): Promise<void> },
  options?: NpmPluginLoaderOptions,
): Promise<void> {
  const results = await Promise.allSettled(
    packageNames.map(async (name) => {
      const plugin = await loadPluginFromNpm(name, options);
      await pluginManager.register(plugin);
      await pluginManager.activate(plugin.manifest.id);
      return { name, plugin };
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { name, plugin } = result.value;
      console.log(`[plugin] Loaded npm plugin: ${name} (${plugin.manifest.id}@${plugin.manifest.version})`);
    } else {
      const pkgName = extractFailedPackageName(result.reason);
      console.warn(`[plugin] Failed to load npm plugin "${pkgName}":`, result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }
}

function extractFailedPackageName(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    const match = msg.match(/Plugin package "([^"]+)"/);
    if (match?.[1]) return match[1];
  }
  return "unknown";
}

/** Clean the plugin cache (for testing or reinstall) */
export async function clearPluginCache(cacheDir?: string): Promise<void> {
  const dir = resolve(cacheDir ?? CACHE_DIR);
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}
