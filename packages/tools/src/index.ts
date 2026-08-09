// @vinhnt-sdk/tools
// Tool system for building AI coding agents

// === Core tool types ===
export type { Tool, ToolConfig } from "./define-tool.js";
export { defineTool, toolToDefinition, zodSchemaToNestedJsonSchema } from "./define-tool.js";
export { ToolRegistry } from "./registry.js";
export type { ToolFilter, ToolPermissionRule, ToolMaterialization } from "./registry.js";
export type { ToolRisk, ToolDefinition } from "./definitions.js";
export type { ToolDefinitionLike } from "@vinhnt-sdk/schema";

// === Tool context ===
export type { ToolContext, PermissionReply } from "./context.js";
export type { JsonSchema7Object, JsonSchemaProperty } from "./json-schema.js";
export type { ToolHook, ToolExecutionResult } from "./types.js";

// === Built-in tools ===
export { createReadFileTool, createWriteFileTool, createEditFileTool, createApplyPatchTool } from "./file-tools.js";
export { createListDirectoryTool } from "./file-tools.js";
export { createShellTool } from "./shell-tool.js";
export type { ShellToolConfig } from "./shell-tool.js";
export { createGitStatusTool, createGitDiffTool, createGitLogTool, createGitCommitTool } from "./git-tools.js";
export { createGlobFilesTool, createGrepFilesTool } from "./search-tools.js";
export { createWebFetchTool } from "./web-tools.js";
export { createReadImageTool, readImageToContentParts } from "./image-tools.js";
export { createQuestionTool } from "./question-tool.js";
export type { QuestionInput, QuestionHandler } from "./question-tool.js";
export { createWebSearchTool } from "./web-search-tool.js";
export type { WebSearchToolConfig, WebSearchProvider } from "./web-search-tool.js";
export { createTodoWriteTool } from "./todo-tool.js";
export { createToolSearchTool } from "./tool-search.js";
export type { ToolSearchInput, ToolSearchResult } from "./tool-search.js";

// === Sandbox ===
export { ToolSandbox, signalToToolContext, createSandbox } from "./sandbox.js";
export type { SandboxConfig, SandboxScope, ProcessSandbox, SandboxResult } from "./sandbox.js";

// === Utilities ===
export { generateDiff } from "./diff.js";
export type { UnifiedDiff } from "./diff.js";
export { lintToolDescription, lintToolDefinitions } from "./description-lint.js";
export type { ToolDescriptionReport, ToolDescriptionIssue, DescriptionIssueCode } from "./description-lint.js";
export { validateInput, ToolInputError } from "./validate.js";
export { commandPattern } from "./arity.js";

// === File history ===
export { FileReadTracker } from "./read-tracker.js";
export { InMemoryFileHistory } from "./file-history.js";
export { createFileHistoryHook } from "./history-hook.js";
export type { FileHistory, FileVersion, UndoEntry } from "./file-history.js";

// === Domain ===
export { createCodingDomain } from "./domain.js";
export type { DomainManifest } from "./domain.js";

// === Lazy registry ===
export { LazyToolRegistry } from "./lazy-registry.js";
export type { LazyToolEntry } from "./lazy-registry.js";

// === Provider system ===
export { ToolProviderRegistry } from "./provider.js";
export type { ToolProvider } from "./provider.js";
export { BuiltinToolProvider, ToolFileProvider, ToolFileLoader, AgentToolProvider, SkillToolProvider } from "./providers/index.js";
export type { BuiltinToolConfig } from "./providers/index.js";
export { createToolProviderRegistry, createToolProvider } from "./provider-helpers.js";

// === Policy ===
export type { ApprovalHandler } from "./policy.js";
