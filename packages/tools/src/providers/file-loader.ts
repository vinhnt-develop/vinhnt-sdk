import { readdir, lstat, realpath, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import type { ToolProvider } from "../provider.js";
import type { ToolDefinition } from "../definitions.js";
import type { ToolRegistry } from "../registry.js";

/**
 * ToolFileProvider — Loads tools from .vnt/tools/ directories.
 *
 * Supports both workspace-local and global tools.
 * Tools can override built-in tools by using the same name.
 */
export class ToolFileProvider implements ToolProvider {
  readonly id: string;
  readonly name: string;
  readonly description = "User-defined tools from .vnt/tools/";

  private _tools: ToolDefinition[] = [];

  constructor(
    id: string,
    name: string,
    tools: ToolDefinition[],
  ) {
    this.id = id;
    this.name = name;
    this._tools = tools;
  }

  get tools(): ToolDefinition[] {
    return this._tools;
  }

  register(_registry: ToolRegistry): void {
    // Registration is handled by ToolProviderRegistry
  }

  unregister(_registry: ToolRegistry): void {
    this._tools = [];
  }
}

/**
 * ToolFileLoader — Discovers and loads tools from .vnt/tools/ directories.
 *
 * Files are verified before import (RV-48): symlinks are rejected, the file
 * must resolve back inside its source directory, and an optional SHA-256 hash
 * pin can be enforced so a swapped file is never executed.
 */
export class ToolFileLoader {
  /**
   * Load tools from a single directory.
   *
   * @param dir - Directory to scan for `.ts`/`.js` tool files.
   * @param hashes - Optional `{ fileName: sha256Hex }` pins — files whose
   *   content hash does not match are skipped (never imported).
   */
  async loadFromDirectory(dir: string, hashes?: Record<string, string>): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) continue;

        const filePath = join(dir, entry.name);
        try {
          if (!(await this.isVerifiedFile(filePath, dir, hashes?.[entry.name]))) continue;
          const tool = await this.loadToolFromFile(filePath);
          if (tool) {
            tools.push(tool);
          }
        } catch (error) {
          console.error(`[ToolFileLoader] Failed to load tool from ${filePath}:`, error);
        }
      }
    } catch {
      // Directory doesn't exist, ignore
    }

    return tools;
  }

  /**
   * Verify a candidate tool file before importing it:
   * 1. Rejects symlinks outright (closes the TOCTOU window between listing and
   *    import — Dirent already filters most symlinks, this is belt-and-braces).
   * 2. The canonical real path must resolve back INSIDE the source directory —
   *    a file that escapes its directory is never executed.
   * 3. Optional SHA-256 hash pin: when a hash is supplied for this file, a
   *    mismatch means the content changed on disk — skip, do not import.
   */
  private async isVerifiedFile(filePath: string, dir: string, expectedHash?: string): Promise<boolean> {
    const st = await lstat(filePath);
    if (st.isSymbolicLink()) return false;

    const [realDir, realFile] = await Promise.all([realpath(dir), realpath(filePath)]);
    if (!isWithin(realDir, realFile)) return false;

    if (expectedHash !== undefined) {
      const content = await readFile(realFile);
      const actual = createHash("sha256").update(content).digest("hex");
      if (actual !== expectedHash) return false;
    }
    return true;
  }

  /**
   * Load a single tool from a file.
   */
  private async loadToolFromFile(filePath: string): Promise<ToolDefinition | null> {
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);

    // Support default export
    if (mod.default && this.isToolDefinition(mod.default)) {
      return mod.default;
    }

    // Support named exports
    for (const value of Object.values(mod)) {
      if (this.isToolDefinition(value)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Check if a value is a ToolDefinition.
   */
  private isToolDefinition(value: unknown): value is ToolDefinition {
    return (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      "description" in value &&
      "risk" in value &&
      "execute" in value &&
      typeof (value as ToolDefinition).execute === "function"
    );
  }

  /**
   * Discover tools from workspace and global directories.
   *
   * Discovery order:
   * 1. Workspace-local: .vnt/tools/*.ts
   * 2. Global: ~/.vnt/tools/*.ts
   *
   * Workspace tools override global tools with the same name.
   */
  async discover(workspaceRoot: string, hashes?: Record<string, string>): Promise<ToolFileProvider> {
    const globalDir = join(process.env.HOME || process.env.USERPROFILE || "", ".vnt", "tools");
    const workspaceDir = join(workspaceRoot, ".vnt", "tools");

    // Load global tools first
    const globalTools = await this.loadFromDirectory(globalDir, hashes);

    // Load workspace tools (overrides global)
    const workspaceTools = await this.loadFromDirectory(workspaceDir, hashes);

    // Merge: workspace overrides global by name
    const toolMap = new Map<string, ToolDefinition>();
    for (const tool of globalTools) {
      toolMap.set(tool.id, tool);
    }
    for (const tool of workspaceTools) {
      toolMap.set(tool.id, tool);
    }

    return new ToolFileProvider(
      "user-tools",
      "User Tools",
      [...toolMap.values()],
    );
  }
}

/** True when `child` is strictly inside `parent` (path-segment safe). */
function isWithin(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}
