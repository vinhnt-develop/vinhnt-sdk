// @vinhnt-sdk/tools
// Core tool system for building AI coding agents

/**
 * Core tool types and utilities for building AI coding agents.
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

// === Domain ===

/**
 * Create a coding domain.
 */
export { createCodingDomain } from "./domain.js";

/**
 * Domain manifest type.
 */
export type { DomainManifest } from "./domain.js";

// === Lazy registry ===

/**
 * Lazy tool registry for deferred loading.
 */
export { LazyToolRegistry } from "./lazy-registry.js";

/**
 * Lazy tool entry type.
 */
export type { LazyToolEntry } from "./lazy-registry.js";

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
 * User tool loading (loads tools from .vnt/tools/ directories).
 */
export { ToolFileProvider, ToolFileLoader } from "./providers/index.js";

// === Policy ===

/**
 * Approval handler type.
 */
export type { ApprovalHandler } from "./policy.js";