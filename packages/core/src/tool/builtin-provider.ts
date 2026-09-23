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

/** Per-tool configuration overrides. Keys are tool IDs (e.g., "shell", "web_search"). */
export interface ToolConfigOverrides {
  /** Enable/disable this tool. If false, tool is excluded from the provider. */
  readonly enabled?: boolean;
  /** Override timeout for this tool (ms). */
  readonly timeoutMs?: number;
  /** Tool-specific config (passed to the tool factory). */
  readonly config?: Record<string, unknown>;
}

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
  /**
   * Per-tool configuration overrides.
   * Keys are tool IDs (e.g., "shell", "web_search", "read_file").
   * Use to enable/disable individual tools or set per-tool timeouts.
   */
  readonly toolConfigs?: Record<string, ToolConfigOverrides>;
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
    const { workspaceRoot, shell, toolConfigs } = this.config;
    const cfg = (id: string) => toolConfigs?.[id];
    const asSystem = (tool: ToolDefinition): ToolDefinition => ({
      ...tool,
      metadata: { ...tool.metadata, source: "system" },
    });

    const allTools: Array<ToolDefinition | null> = [
      // File tools
      this.applyConfig(asSystem(createReadFileTool(workspaceRoot)), cfg("read_file")),
      this.applyConfig(asSystem(createWriteFileTool(workspaceRoot)), cfg("write_file")),
      this.applyConfig(asSystem(createEditFileTool(workspaceRoot)), cfg("edit_file")),
      this.applyConfig(asSystem(createApplyPatchTool(workspaceRoot)), cfg("apply_patch")),
      this.applyConfig(asSystem(createListDirectoryTool(workspaceRoot)), cfg("list_directory")),

      // Shell tool
      this.applyConfig(asSystem(createShellTool(shell)), cfg("execute_command")),

      // Search tools
      this.applyConfig(asSystem(createGlobFilesTool(workspaceRoot)), cfg("glob_files")),
      this.applyConfig(asSystem(createGrepFilesTool(workspaceRoot)), cfg("grep_files")),

      // Web tools
      this.applyConfig(asSystem(createWebFetchTool()), cfg("web_fetch")),
      ...this.createWebSearchTool().map((t) => this.applyConfig(asSystem(t), cfg("web_search"))),

      // Git tools
      this.applyConfig(asSystem(createGitStatusTool(workspaceRoot)), cfg("git_status")),
      this.applyConfig(asSystem(createGitDiffTool(workspaceRoot)), cfg("git_diff")),
      this.applyConfig(asSystem(createGitLogTool(workspaceRoot)), cfg("git_log")),
      this.applyConfig(asSystem(createGitCommitTool(workspaceRoot)), cfg("git_commit")),

      // Utility tools
      this.applyConfig(asSystem(createTodoWriteTool()), cfg("todowrite")),
      this.applyConfig(asSystem(createQuestionTool()), cfg("question")),
      this.applyConfig(asSystem(createReadImageTool(workspaceRoot)), cfg("read_image")),
    ];

    // Filter out disabled tools (null)
    return allTools.filter((t): t is ToolDefinition => t !== null);
  }

  /** Apply per-tool config overrides. Returns null if tool is disabled. */
  private applyConfig(tool: ToolDefinition, override?: ToolConfigOverrides): ToolDefinition | null {
    if (!override) return tool;
    if (override.enabled === false) return null;

    let result = tool;
    if (override.timeoutMs !== undefined) {
      result = { ...result, timeoutMs: override.timeoutMs };
    }
    return result;
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
