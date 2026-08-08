import type { ToolProvider } from "../provider.js";
import type { ToolDefinition } from "../definitions.js";
import { createReadFileTool, createWriteFileTool, createEditFileTool, createApplyPatchTool, createListDirectoryTool } from "../file-tools.js";
import { createShellTool } from "../shell-tool.js";
import { createGlobFilesTool, createGrepFilesTool } from "../search-tools.js";
import { createWebFetchTool } from "../web-tools.js";
import { createWebSearchTool, type WebSearchProvider } from "../web-search-tool.js";
import { createGitStatusTool, createGitDiffTool, createGitLogTool, createGitCommitTool } from "../git-tools.js";
import { createTodoWriteTool } from "../todo-tool.js";
import { createQuestionTool } from "../question-tool.js";
import { createReadImageTool } from "../image-tools.js";
import type { ShellToolConfig } from "../shell-tool.js";
import type { ToolRegistry } from "../registry.js";

export interface BuiltinToolConfig {
  workspaceRoot: string | (() => string);
  shell: ShellToolConfig;
  /** Web search provider — injectable dependency */
  webSearchProvider?: WebSearchProvider;
  /**
   * @deprecated Use webSearchProvider instead. Will be removed in next major version.
   * Kept for backward compatibility — creates a TavilySearchProvider automatically.
   */
  webSearchApiKey?: string | (() => string);
}

/**
 * BuiltinToolProvider — Provides all built-in coding tools.
 *
 * These tools are always available and can be overridden
 * by user tools in .vnt/tools/ or ~/.vnt/tools/.
 */
export class BuiltinToolProvider implements ToolProvider {
  readonly id = "builtin";
  readonly name = "Built-in Tools";
  readonly description = "Core coding tools: file operations, shell, search, git, web";

  private _tools: ToolDefinition[] | null = null;
  private readonly config: BuiltinToolConfig;

  constructor(config: BuiltinToolConfig) {
    this.config = config;
  }

  get tools(): ToolDefinition[] {
    if (this._tools === null) {
      this._tools = this.createTools();
    }
    return this._tools;
  }

  private createTools(): ToolDefinition[] {
    const { workspaceRoot, shell } = this.config;

    const tools: ToolDefinition[] = [
      // File tools
      createReadFileTool(workspaceRoot),
      createWriteFileTool(workspaceRoot),
      createEditFileTool(workspaceRoot),
      createApplyPatchTool(workspaceRoot),
      createListDirectoryTool(workspaceRoot),

      // Shell tool
      createShellTool(shell),

      // Search tools
      createGlobFilesTool(workspaceRoot),
      createGrepFilesTool(workspaceRoot),

      // Web tools
      createWebFetchTool(),
      ...this.createWebSearchTool(),

      // Git tools
      createGitStatusTool(workspaceRoot),
      createGitDiffTool(workspaceRoot),
      createGitLogTool(workspaceRoot),
      createGitCommitTool(workspaceRoot),

      // Utility tools
      createTodoWriteTool(),
      createQuestionTool(),
      createReadImageTool(),
    ];

    return tools;
  }

  private createWebSearchTool(): ToolDefinition[] {
    const { webSearchProvider, webSearchApiKey } = this.config;

    if (webSearchProvider) {
      return [createWebSearchTool({ provider: webSearchProvider })];
    }

    if (webSearchApiKey) {
      // Backward compatibility: create TavilySearchProvider from API key
      // Note: This imports TavilySearchProvider lazily to avoid circular deps
      // and to keep it optional
      const { TavilySearchProvider } = require("../web-search-tool.js");
      const apiKey = typeof webSearchApiKey === "function" ? webSearchApiKey() : webSearchApiKey;
      if (apiKey) {
        return [createWebSearchTool({
          provider: new TavilySearchProvider({ apiKey }),
        })];
      }
    }

    return [];
  }

  register(_registry: ToolRegistry): void {
    // Registration is handled by ToolProviderRegistry
  }

  unregister(_registry: ToolRegistry): void {
    // Cleanup is handled by ToolProviderRegistry
  }
}
