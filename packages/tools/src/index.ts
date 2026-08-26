/**
 * @module tools
 * Built-in tools for VNT Agent — file, shell, git, web, search, and more.
 */

// === Core tool types ===

export type { Tool, ToolConfig } from "./define-tool.js";
export { defineTool, toolToDefinition, zodSchemaToNestedJsonSchema } from "./define-tool.js";
export { commandPattern, prefix } from "./arity.js";

export type { ToolDefinitionLike } from "@vinhnt-sdk/schema";
export type { ToolDefinition, ToolRisk } from "./definitions.js";

// === Registry ===

export type { ToolFilter, ToolPermissionRule, ToolMaterialization } from "./registry.js";
export { ToolRegistry } from "./registry.js";

// === Context ===

export type { ToolContext, PermissionReply } from "./context.js";
export type { ToolHook, ToolExecutionResult } from "./types.js";

// === JSON Schema ===

export type { JsonSchema7Object, JsonSchemaProperty } from "./json-schema.js";

// === Validation ===

export { validateInput } from "./validate.js";
export { ToolInputError } from "./validate.js";

// === Diff ===

export { generateDiff } from "./diff.js";
export type { UnifiedDiff } from "./diff.js";

// === Domain ===

export { createCodingDomain } from "./domain.js";
export type { DomainManifest } from "./domain.js";

// === Lazy registry ===

export { LazyToolRegistry } from "./lazy-registry.js";
export type { LazyToolEntry } from "./lazy-registry.js";

// === Provider system ===

export { ToolProviderRegistry } from "./provider.js";
export type { ToolProvider } from "./provider.js";
export { ToolFileProvider, ToolFileLoader } from "./providers/index.js";

// === Policy ===

export type { ApprovalHandler } from "./policy.js";

// === Saga ===

export { ToolSaga } from "./saga.js";
export type { SagaEntry, CompensationAction } from "./saga.js";

// === File tools ===

export {
  createReadFileTool, createWriteFileTool, createEditFileTool,
  createApplyPatchTool, createListDirectoryTool,
  ensurePathAccess, resolveRoot, DEFAULT_EXCLUDED_DIRS,
} from "./file-tools.js";
export type { RootGetter } from "./file-tools.js";

// === Image tools ===

export { createReadImageTool, readImageToContentParts } from "./image-tools.js";

// === File history ===

export { FileReadTracker } from "./read-tracker.js";
export { InMemoryFileHistory } from "./file-history.js";
export { createFileHistoryHook } from "./history-hook.js";
export type { FileHistory, FileVersion, UndoEntry } from "./file-history.js";

// === Shell tool ===

export { createShellTool } from "./shell-tool.js";
export type { ShellToolConfig } from "./shell-tool.js";
export { ToolSandbox, signalToToolContext, createSandbox } from "./tool-sandbox.js";

// === Search tools ===

export { createGlobFilesTool, createGrepFilesTool, DEFAULT_IGNORED_DIRS } from "./search-tools.js";
export { createToolSearchTool } from "./tool-search.js";
export type { ToolSearchInput, ToolSearchResult } from "./tool-search.js";

// === Web tools ===

export { createWebFetchTool } from "./web-tools.js";
export type { WebFetchToolConfig } from "./web-tools.js";
export { createWebSearchTool, TavilySearchProvider, SerperSearchProvider } from "./web-search-tool.js";
export type { WebSearchToolConfig, WebSearchProvider, WebSearchResponse, SearchResult } from "./web-search-tool.js";

// === Git tools ===

export { createGitStatusTool, createGitDiffTool, createGitLogTool, createGitCommitTool } from "./git-tools.js";

// === Agent tools ===

export { createQuestionTool } from "./question-tool.js";
export type { QuestionInput, QuestionHandler } from "./question-tool.js";
export { createTodoWriteTool } from "./todo-tool.js";
export { AgentToolProvider } from "./agent-provider.js";
export type { KernelLike } from "./agent-provider.js";
export { SkillToolProvider } from "./skill-provider.js";

// === Image tools ===

export { readImageToContentParts as readImageFromImageTools } from "./image-tools.js";

// === Description lint ===

export { lintToolDescription, lintToolDefinitions } from "./description-lint.js";
