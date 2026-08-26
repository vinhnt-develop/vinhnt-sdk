import type { ToolProvider, ToolDefinition, ToolRegistry } from "@vinhnt-sdk/tools";
import type { ShellToolConfig } from "@vinhnt-sdk/tools";
import {
  createReadFileTool, createWriteFileTool, createEditFileTool, createApplyPatchTool, createListDirectoryTool,
  createReadImageTool,
} from "@vinhnt-sdk/tools";
import { createShellTool } from "@vinhnt-sdk/tools";
import { createGlobFilesTool, createGrepFilesTool } from "@vinhnt-sdk/tools";
import { createWebFetchTool, createWebSearchTool, type WebSearchProvider, TavilySearchProvider } from "@vinhnt-sdk/tools";
import { createGitStatusTool, createGitDiffTool, createGitLogTool, createGitCommitTool } from "@vinhnt-sdk/tools";
import { createTodoWriteTool, createQuestionTool } from "@vinhnt-sdk/tools";

/** Configuration for {@link BuiltinToolProvider}. */
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
      createReadImageTool(workspaceRoot),
    ];

    return tools;
  }

  private createWebSearchTool(): ToolDefinition[] {
    const { webSearchProvider, webSearchApiKey } = this.config;

    if (webSearchProvider) {
      return [createWebSearchTool({ provider: webSearchProvider })];
    }

    if (webSearchApiKey) {
      const apiKey = typeof webSearchApiKey === "function" ? webSearchApiKey() : webSearchApiKey;
      if (apiKey) {
        return [createWebSearchTool({
          provider: new TavilySearchProvider({ apiKey }),
        })];
      }
    }

    return [];
  }

  register(_registry: ToolRegistry): void {}
  unregister(_registry: ToolRegistry): void {}
}
