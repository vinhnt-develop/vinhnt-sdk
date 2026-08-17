// @vinhnt-sdk/tools
// Tool system for building AI coding agents

/**
 * Core tool types and utilities for building AI coding agents.
 * 
 * Tools enable agents to interact with the file system, execute shell commands,
 * search code, and perform other operations.
 * 
 * @example
 * ```typescript
 * import { defineTool, ToolRegistry } from "@vinhnt-sdk/tools";
 * import { z } from "zod";
 * 
 * const myTool = defineTool({
 *   name: "my_tool",
 *   description: "A custom tool",
 *   risk: "read",
 *   input: z.object({
 *     query: z.string(),
 *   }),
 *   async execute(input, ctx) {
 *     return `Result: ${input.query}`;
 *   },
 * });
 * 
 * const registry = new ToolRegistry();
 * registry.register(myTool);
 * ```
 */

// === Core tool types ===

/**
 * Tool type definition.
 */
export type { Tool, ToolConfig } from "./define-tool.js";

/**
 * Define a new tool.
 */
export { defineTool, toolToDefinition, zodSchemaToNestedJsonSchema } from "./define-tool.js";

/**
 * Tool registry for managing tools.
 */
export { ToolRegistry } from "./registry.js";

/**
 * Tool registry types.
 */
export type { ToolFilter, ToolPermissionRule, ToolMaterialization } from "./registry.js";

/**
 * Tool risk levels and definitions.
 */
export type { ToolRisk, ToolDefinition } from "./definitions.js";

/**
 * Tool definition like interface from schema.
 */
export type { ToolDefinitionLike } from "@vinhnt-sdk/schema";

/**
 * Tool context and types.
 */

// === Tool context ===

/**
 * Tool execution context.
 */
export type { ToolContext, PermissionReply } from "./context.js";

/**
 * JSON Schema types.
 */
export type { JsonSchema7Object, JsonSchemaProperty } from "./json-schema.js";

/**
 * Tool hooks and execution results.
 */
export type { ToolHook, ToolExecutionResult } from "./types.js";

/**
 * Built-in tools for file operations, shell commands, and more.
 * 
 * @example
 * ```typescript
 * import { createReadFileTool, createShellTool } from "@vinhnt-sdk/tools";
 * 
 * const readFile = createReadFileTool(() => "/workspace");
 * const shell = createShellTool(() => "/workspace");
 * ```
 */

// === Built-in tools ===

/**
 * File operation tools.
 */
export { createReadFileTool, createWriteFileTool, createEditFileTool, createApplyPatchTool } from "./file-tools.js";

/**
 * Directory listing tool.
 */
export { createListDirectoryTool } from "./file-tools.js";

/**
 * Shell command execution tool.
 */
export { createShellTool } from "./shell-tool.js";

/**
 * Shell tool configuration.
 */
export type { ShellToolConfig } from "./shell-tool.js";

/**
 * Git operation tools.
 */
export { createGitStatusTool, createGitDiffTool, createGitLogTool, createGitCommitTool } from "./git-tools.js";

/**
 * Search tools for file and content search.
 */
export { createGlobFilesTool, createGrepFilesTool } from "./search-tools.js";

/**
 * Web fetch tool.
 */
export { createWebFetchTool } from "./web-tools.js";

/**
 * Image reading tool.
 */
export { createReadImageTool, readImageToContentParts } from "./image-tools.js";

/**
 * Question tool for user interaction.
 */
export { createQuestionTool } from "./question-tool.js";

/**
 * Question tool types.
 */
export type { QuestionInput, QuestionHandler } from "./question-tool.js";

/**
 * Web search tool.
 */
export { createWebSearchTool, TavilySearchProvider, SerperSearchProvider } from "./web-search-tool.js";

/**
 * Web search tool configuration.
 */
export type { WebSearchToolConfig, WebSearchProvider } from "./web-search-tool.js";

/**
 * Todo list management tool.
 */
export { createTodoWriteTool } from "./todo-tool.js";

/**
 * Tool search tool for finding other tools.
 */
export { createToolSearchTool } from "./tool-search.js";

/**
 * Tool search types.
 */
export type { ToolSearchInput, ToolSearchResult } from "./tool-search.js";

/**
 * Sandbox system for isolated tool execution.
 */

// === Sandbox ===

/**
 * Sandbox for isolated tool execution.
 */
export { ToolSandbox, signalToToolContext, createSandbox } from "./sandbox.js";

/**
 * Tree-scoped process termination (kills child + grandchildren on abort/timeout).
 */
export { killProcessTree, isPidAlive, treeKillSpawnOptions } from "./kill-tree.js";

/**
 * Sandbox configuration and types.
 */
export type { SandboxConfig, SandboxScope, ProcessSandbox, SandboxResult } from "./sandbox.js";

/**
 * Utility functions for tools.
 */

// === Utilities ===

/**
 * Generate unified diffs.
 */
export { generateDiff } from "./diff.js";

/**
 * Diff types.
 */
export type { UnifiedDiff } from "./diff.js";

/**
 * Tool description linting utilities.
 */
export { lintToolDescription, lintToolDefinitions } from "./description-lint.js";

/**
 * Tool description linting types.
 */
export type { ToolDescriptionReport, ToolDescriptionIssue, DescriptionIssueCode } from "./description-lint.js";

/**
 * Input validation utilities.
 */
export { validateInput, ToolInputError } from "./validate.js";

/**
 * Command pattern utilities.
 */
export { commandPattern, prefix } from "./arity.js";

/**
 * File history tracking system.
 */

// === File history ===

/**
 * File read tracker.
 */
export { FileReadTracker } from "./read-tracker.js";

/**
 * In-memory file history store.
 */
export { InMemoryFileHistory } from "./file-history.js";

/**
 * File history hook for tracking changes.
 */
export { createFileHistoryHook } from "./history-hook.js";

/**
 * File history types.
 */
export type { FileHistory, FileVersion, UndoEntry } from "./file-history.js";

/**
 * Domain system for organizing tools.
 */

// === Domain ===

/**
 * Create a coding domain.
 */
export { createCodingDomain } from "./domain.js";

/**
 * Domain manifest type.
 */
export type { DomainManifest } from "./domain.js";

/**
 * Lazy loading for tools.
 */

// === Lazy registry ===

/**
 * Lazy tool registry for deferred loading.
 */
export { LazyToolRegistry } from "./lazy-registry.js";

/**
 * Lazy tool entry type.
 */
export type { LazyToolEntry } from "./lazy-registry.js";

/**
 * Tool provider system.
 */

// === Provider system ===

/**
 * Tool provider registry.
 */
export { ToolProviderRegistry } from "./provider.js";

/**
 * Tool provider interface.
 */
export type { ToolProvider } from "./provider.js";

/**
 * Built-in tool providers.
 */
export { BuiltinToolProvider, ToolFileProvider, ToolFileLoader, AgentToolProvider, SkillToolProvider } from "./providers/index.js";

/**
 * Built-in tool provider configuration.
 */
export type { BuiltinToolConfig } from "./providers/index.js";

/**
 * Tool provider helper functions.
 */
export { createToolProviderRegistry, createToolProvider } from "./provider-helpers.js";

/**
 * Policy system for tool permissions.
 */

// === Policy ===

/**
 * Approval handler type.
 */
export type { ApprovalHandler } from "./policy.js";
