// Re-export core tool infra from @vinhnt-sdk/tools
export { ToolRegistry } from "@vinhnt-sdk/tools";
export type { ToolPermissionRule, ToolMaterialization } from "@vinhnt-sdk/tools";
export { createCodingDomain } from "@vinhnt-sdk/tools";
export type { DomainManifest } from "@vinhnt-sdk/tools";
export { defineTool, toolToDefinition, zodSchemaToNestedJsonSchema } from "@vinhnt-sdk/tools";
export type { Tool, ToolConfig } from "@vinhnt-sdk/tools";
export { LazyToolRegistry } from "@vinhnt-sdk/tools";
export type { LazyToolEntry } from "@vinhnt-sdk/tools";
export type { ApprovalHandler } from "@vinhnt-sdk/tools";
export { generateDiff } from "@vinhnt-sdk/tools";
export type { UnifiedDiff } from "@vinhnt-sdk/tools";
export { ToolProviderRegistry } from "@vinhnt-sdk/tools";
export type { ToolProvider } from "@vinhnt-sdk/tools";
export type { ToolRisk, ToolDefinition, ToolDefinitionLike } from "@vinhnt-sdk/tools";
export type { ToolContext, ToolHook, PermissionReply, ToolExecutionResult } from "@vinhnt-sdk/tools";
export { ToolFileProvider, ToolFileLoader } from "@vinhnt-sdk/tools";

// File-system tool family
export {
  createReadFileTool, createWriteFileTool, createEditFileTool, createApplyPatchTool,
  createListDirectoryTool, createReadImageTool, readImageToContentParts,
  FileReadTracker, InMemoryFileHistory, createFileHistoryHook,
} from "@vinhnt-sdk/tools-fs";
export type { FileHistory, FileVersion, UndoEntry } from "@vinhnt-sdk/tools-fs";

// Shell tool family
export { createShellTool, ToolSandbox, signalToToolContext, createSandbox } from "@vinhnt-sdk/tools-shell";
export type { ShellToolConfig } from "@vinhnt-sdk/tools-shell";
export type { SandboxConfig } from "@vinhnt-sdk/sandbox";
export { killProcessTree, isPidAlive, treeKillSpawnOptions } from "@vinhnt-sdk/sandbox";
export type { SandboxScope, ProcessSandbox, SandboxResult } from "@vinhnt-sdk/sandbox";
export { SandboxUnavailableError } from "@vinhnt-sdk/sandbox";

// Web tool family
export { createWebFetchTool, createWebSearchTool, TavilySearchProvider, SerperSearchProvider } from "@vinhnt-sdk/tools-web";
export type { WebSearchToolConfig, WebSearchProvider } from "@vinhnt-sdk/tools-web";

// Git tool family
export { createGitStatusTool, createGitDiffTool, createGitLogTool, createGitCommitTool } from "@vinhnt-sdk/tools-git";

// Search tool family
export { createGlobFilesTool, createGrepFilesTool, createToolSearchTool } from "@vinhnt-sdk/tools-search";
export type { ToolSearchInput, ToolSearchResult } from "@vinhnt-sdk/tools-search";

// Agent tool family
export { createQuestionTool, createTodoWriteTool, AgentToolProvider, SkillToolProvider } from "@vinhnt-sdk/tools-agent";
export type { QuestionInput, QuestionHandler } from "@vinhnt-sdk/tools-agent";

// Aggregator (composition root lives in core)
export { BuiltinToolProvider } from "./builtin-provider.js";
export type { BuiltinToolConfig } from "./builtin-provider.js";

// Core-only: kernel integration
export { ToolRuntime } from "./runtime.js";
export type { ToolRuntimeConfig } from "./runtime.js";
export { createKernelTools, createPluginToolHook } from "./bridge.js";
export { createToolProviderRegistry, createToolProvider, registerProviderTools } from "./provider-helpers.js";