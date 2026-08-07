import { readdir } from "node:fs/promises";
import { join } from "node:path";
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
 */
export class ToolFileLoader {
  /**
   * Load tools from a single directory.
   */
  async loadFromDirectory(dir: string): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) continue;

        const filePath = join(dir, entry.name);
        try {
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
  async discover(workspaceRoot: string): Promise<ToolFileProvider> {
    const globalDir = join(process.env.HOME || process.env.USERPROFILE || "", ".vnt", "tools");
    const workspaceDir = join(workspaceRoot, ".vnt", "tools");

    // Load global tools first
    const globalTools = await this.loadFromDirectory(globalDir);

    // Load workspace tools (overrides global)
    const workspaceTools = await this.loadFromDirectory(workspaceDir);

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
