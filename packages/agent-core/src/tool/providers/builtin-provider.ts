import type { ToolProvider } from "../provider.js";
import type { ToolDefinition } from "../definitions.js";
import { createReadFileTool, createWriteFileTool, createEditFileTool, createApplyPatchTool, createListDirectoryTool } from "../file-tools.js";
import { createShellTool } from "../shell-tool.js";
import { createGlobFilesTool, createGrepFilesTool } from "../search-tools.js";
import { createWebFetchTool } from "../web-tools.js";
import { createWebSearchTool } from "../web-search-tool.js";
import { createGitStatusTool, createGitDiffTool, createGitLogTool, createGitCommitTool } from "../git-tools.js";
import { createTodoWriteTool } from "../todo-tool.js";
import { createQuestionTool } from "../question-tool.js";
import { createReadImageTool } from "../image-tools.js";
import type { ShellToolConfig } from "../shell-tool.js";
import type { ToolRegistry } from "../registry.js";

export interface BuiltinToolConfig {
  workspaceRoot: string | (() => string);
  shell: ShellToolConfig;
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
    const { workspaceRoot, shell, webSearchApiKey } = this.config;

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
      ...(webSearchApiKey ? [createWebSearchTool({ apiKey: webSearchApiKey })] : []),

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

  register(_registry: ToolRegistry): void {
    // Registration is handled by ToolProviderRegistry
  }

  unregister(_registry: ToolRegistry): void {
    // Cleanup is handled by ToolProviderRegistry
  }
}
