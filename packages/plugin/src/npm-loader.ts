import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import type { Plugin } from "@vinhnt-sdk/core";

const CACHE_DIR = ".vnt/plugins";

export interface NpmPluginLoaderOptions {
  cacheDir?: string;
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
 */
export async function loadPluginFromNpm(
  packageName: string,
  options?: NpmPluginLoaderOptions,
): Promise<Plugin> {
  const cacheDir = resolve(options?.cacheDir ?? CACHE_DIR);
  const { name: pkgName, version } = parsePackageSpec(packageName);
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
    console.log(`[plugin] Installing npm plugin: ${installSpec}`);
    await execAsync("npm", ["install", installSpec, "--save", "--no-audit", "--no-fund"], cacheDir);
    await writeFile(cacheMarker, Date.now().toString(), "utf-8");
    console.log(`[plugin] Installed: ${installSpec}`);
  }

  const pkgJsonPath = join(pkgDir, "package.json");
  const localRequire = createRequire(pkgJsonPath);
  const mod = localRequire(pkgDir);
  if (!mod || typeof mod !== "object") {
    throw new Error(`Plugin package "${packageName}" did not export a valid plugin`);
  }
  const defaultExport = "default" in mod ? mod.default : mod;
  if (!defaultExport || typeof defaultExport !== "object" || !("manifest" in defaultExport)) {
    throw new Error(`Plugin package "${packageName}" default export is not a valid Plugin object (missing manifest)`);
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
