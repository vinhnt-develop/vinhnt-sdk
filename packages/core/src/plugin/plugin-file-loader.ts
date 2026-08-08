import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Plugin, PluginManifest } from "../plugin.js";

export interface PluginSourceDir {
  type: "global" | "project";
  dir: string;
  priority: number;
}

export interface PluginFileLoaderConfig {
  parser?: (content: string, filePath: string) => Plugin | null;
}

/**
 * PluginFileLoader — Discovers and loads plugins from file system.
 *
 * Convention:
 *   .vnt/plugins/<plugin-id>/plugin.ts   (project)
 *   .vnt/plugins/<plugin-id>/plugin.js
 *   ~/.vnt/plugins/<plugin-id>/plugin.ts (global)
 *   ~/.vnt/plugins/<plugin-id>/plugin.js
 *   .claude/plugins/<plugin-id>/plugin.ts (Claude-compatible)
 *   .agents/plugins/<plugin-id>/plugin.ts (Agents-compatible)
 */
export class PluginFileLoader {
  private readonly parser: (content: string, filePath: string) => Plugin | null;

  constructor(config?: PluginFileLoaderConfig) {
    this.parser = config?.parser ?? defaultPluginParser;
  }

  /**
   * Load plugins from a directory.
   * Each subdirectory with a `plugin.ts` or `plugin.js` file is a plugin.
   */
  async loadFromDirectory(
    dir: string,
    _source: PluginSourceDir,
  ): Promise<Plugin[]> {
    const plugins: Plugin[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const pluginDir = join(dir, entry.name);
        const pluginFile = await findPluginFile(pluginDir);

        if (!pluginFile) continue;

        try {
          const content = await readFile(pluginFile, "utf-8");
          const plugin = this.parser(content, pluginFile);

          if (plugin) {
            plugins.push(plugin);
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Directory doesn't exist — not an error
    }

    return plugins;
  }

  /**
   * Load plugins from multiple directories (global first, then project).
   */
  async loadFromDirectories(dirs: PluginSourceDir[]): Promise<Plugin[]> {
    const allPlugins: Plugin[] = [];

    // Sort by priority (lower = higher priority)
    const sorted = [...dirs].sort((a, b) => a.priority - b.priority);

    for (const source of sorted) {
      const plugins = await this.loadFromDirectory(source.dir, source);

      for (const plugin of plugins) {
        // Later plugins override earlier ones with same ID
        const existingIdx = allPlugins.findIndex(
          (p) => p.manifest.id === plugin.manifest.id,
        );

        if (existingIdx >= 0) {
          allPlugins[existingIdx] = plugin;
        } else {
          allPlugins.push(plugin);
        }
      }
    }

    return allPlugins;
  }
}

async function findPluginFile(pluginDir: string): Promise<string | null> {
  const candidates = ["plugin.ts", "plugin.js", "index.ts", "index.js"];

  for (const name of candidates) {
    const filePath = join(pluginDir, name);
    try {
      const s = await stat(filePath);
      if (s.isFile()) return filePath;
    } catch {
      // not found
    }
  }

  return null;
}

function defaultPluginParser(content: string, _filePath: string): Plugin | null {
  // Simple parser: try to extract manifest from file content
  // In production, this would use dynamic import or a safer sandbox
  const idMatch = content.match(/id:\s*["']([^"']+)["']/);
  const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
  const versionMatch = content.match(/version:\s*["']([^"']+)["']/);
  const descMatch = content.match(/description:\s*["']([^"']+)["']/);
  const authorMatch = content.match(/author:\s*["']([^"']+)["']/);

  if (!idMatch) return null;

  const manifest: PluginManifest = {
    id: idMatch[1]!,
    name: nameMatch?.[1] ?? idMatch[1]!,
    version: versionMatch?.[1] ?? "0.0.0",
    description: descMatch?.[1],
    author: authorMatch?.[1],
  };

  // Note: actual hook implementation requires dynamic import at runtime
  // This parser only extracts the manifest metadata
  return {
    manifest,
    async activate() {
      // Plugin activation happens at runtime via dynamic import
    },
  };
}

/**
 * PluginFileProvider — Implements ToolProvider interface for plugin files.
 * Actually, this is a PluginProvider (not ToolProvider), but follows same pattern.
 */
export interface PluginProvider {
  readonly id: string;
  readonly name: string;
  readonly plugins: Plugin[];
}
