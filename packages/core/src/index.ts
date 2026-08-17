// @vinhnt-sdk/core
// Core agent engine for building AI coding agents
//
// PUBLIC API - Only essential exports for users
// Internal implementation details are NOT exported here

/**
 * Core agent kernel for building AI coding agents.
 * 
 * The kernel manages agent lifecycle, tool execution, permissions, and LLM interactions.
 * 
 * @example
 * ```typescript
 * import { AgentKernel } from "@vinhnt-sdk/core";
 * 
 * const kernel = new AgentKernel({
 *   workspaceRoot: "/path/to/project",
 *   maxConcurrent: 3,
 * });
 * 
 * await kernel.start();
 * ```
 */

// === Kernel (core runtime) ===

/**
 * Main agent kernel class - manages agent lifecycle and execution.
 * 
 * @example
 * ```typescript
 * const kernel = new AgentKernel({
 *   workspaceRoot: "/path/to/project",
 *   maxConcurrent: 3,
 *   toolRegistry: myToolRegistry,
 * });
 * 
 * const run = await kernel.startRun({
 *   agentId: "coder",
 *   prompt: "Write a hello world program",
 * });
 * ```
 */
export { AgentKernel, KernelError } from "./kernel/kernel.js";
export { canTransitionRun, terminalRunStatuses } from "./kernel/state-machine.js";
export { RunStateMachine } from "./kernel/run-state.js";

/**
 * Configuration for the agent kernel.
 */
export type { AgentKernelConfig, RunHandle, AgentRunHandle, AgentRunResult } from "./kernel/kernel-types.js";

// === Agent system ===

/**
 * Factory function for creating agent configurations.
 * 
 * @example
 * ```typescript
 * const agent = createAgent({
 *   id: "coder",
 *   name: "Coder Agent",
 *   model: "gpt-4",
 *   systemPrompt: "You are a helpful coding assistant.",
 * });
 * ```
 */
export { createAgent } from "./agent/agent-factory.js";

/**
 * Parameters for creating an agent.
 */
export type { CreateAgentParams } from "./agent/agent-factory.js";

// === Event bus ===

/**
 * In-memory event bus for publishing and subscribing to events.
 * 
 * @example
 * ```typescript
 * const bus = new InMemoryEventBus();
 * 
 * bus.on("tool.executed", (event) => {
 *   console.log("Tool executed:", event.toolId);
 * });
 * 
 * await bus.publish({
 *   type: "tool.executed",
 *   toolId: "read_file",
 *   timestamp: Date.now(),
 * });
 * ```
 */
export { InMemoryEventBus } from "@vinhnt-sdk/event";

/**
 * Event bus interface and types.
 */
export type { EventBus, EventHandler, Unsubscribe } from "@vinhnt-sdk/event";

// === Session management ===

/**
 * In-memory session state management.
 */
export { InMemorySessionState } from "./session/in-memory-session-state.js";

/**
 * Coordinates multiple runs within a session.
 */
export { SessionRunCoordinator } from "./session/run-coordinator.js";

/**
 * Session and run event store interfaces.
 */
export type { RunEventStore, SessionStore } from "./session/store.js";

// === Agent registry ===

/**
 * In-memory agent registry for managing agent configurations.
 * 
 * @example
 * ```typescript
 * const registry = new InMemoryAgentRegistry();
 * registry.register({
 *   id: "coder",
 *   name: "Coder Agent",
 *   model: "gpt-4",
 * });
 * 
 * const agent = registry.get("coder");
 * ```
 */
export { InMemoryAgentRegistry } from "./agent/agent-registry.js";

/**
 * Agent registry interface.
 */
export type { AgentRegistry } from "./agent/agent-registry.js";

// === Model registry ===

/**
 * In-memory model registry for managing model providers.
 * 
 * @example
 * ```typescript
 * const registry = new InMemoryModelRegistry();
 * registry.register({
 *   id: "openai",
 *   name: "OpenAI",
 *   baseUrl: "https://api.openai.com",
 * });
 * ```
 */
export { InMemoryModelRegistry } from "./model.js";

/**
 * Model provider interfaces and types.
 */
export type { ModelProvider, ModelRequest, ModelResponse, ModelStreamEvent, ModelUsage, ContentPart, ToolCallResult } from "./model.js";
export { getTextContent } from "./model.js";

// === Permission stores ===

/**
 * In-memory approval store for managing permission approvals.
 */
export { InMemoryApprovalStore } from "@vinhnt-sdk/permission";

/**
 * Approval store interface.
 */
export type { ApprovalStore } from "@vinhnt-sdk/permission";

// === Workspace ===

/**
 * Workspace manager for handling file operations and workspace context.
 */
export { WorkspaceManager } from "./workspace.js";

// === Skill system ===

/**
 * In-memory skill definition registry.
 */
export { InMemorySkillDefRegistry } from "./skill/skill-def-registry.js";

// === Tracing ===

/**
 * Request tracing for monitoring and debugging.
 */
export { Tracer } from "./tracer.js";

// === Logger ===

/**
 * Set the global logger instance.
 * 
 * @example
 * ```typescript
 * import { setLogger } from "@vinhnt-sdk/core";
 * 
 * setLogger({
 *   info: (msg, ...args) => console.log(msg, ...args),
 *   warn: (msg, ...args) => console.warn(msg, ...args),
 *   error: (msg, ...args) => console.error(msg, ...args),
 *   debug: (msg, ...args) => console.debug(msg, ...args),
 * });
 * ```
 */
export { setLogger, setLogLevel, getLogger } from "./logger.js";

/**
 * Logger interface and log level types.
 */
export type { Logger, LogLevel } from "./logger.js";

// === Plugin system ===

/**
 * Plugin system interfaces and types.
 */
export type { PluginManifest, PluginContext, PluginHooks, Plugin } from "./plugin.js";

/**
 * System context types.
 */
export type { ContextSourceValue, ContextSourceKey } from "./system-context/types.js";

// === Re-export essential types from schema ===

/**
 * Core type identifiers.
 */
export type {
  RunId, SessionId, AgentId, TraceId, RequestId,
  RunStatus, RequestContext,
  AgentConfig, AgentProfile,
  Session, Message,
} from "@vinhnt-sdk/schema";

/**
 * Error classes for the SDK.
 * 
 * All errors extend VntError and include error codes and retryable flags.
 */
export {
  VntError,
  AgentNotFoundError, AgentValidationError, AgentPermissionDenied,
  ToolNotFoundError, ToolExecutionError, ToolPermissionDenied,
  RunNotFoundError, RunAbortedError, RunTimeoutError,
  CircuitBreakerOpenError, ToolInputError,
  PermissionDeniedError, ValidationError, TimeoutError,
  NetworkError, RateLimitError, AuthenticationError,
  ConfigurationError, PluginError,
} from "@vinhnt-sdk/schema";

/**
 * Error context type.
 */
export type { VntErrorCtx } from "@vinhnt-sdk/schema";

// === Re-export essential types from tools ===

/**
 * Define a custom tool.
 * 
 * @example
 * ```typescript
 * import { defineTool } from "@vinhnt-sdk/core";
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
 * ```
 */
export { defineTool, ToolRegistry } from "@vinhnt-sdk/tools";

/**
 * Tool system types.
 */
export type { Tool, ToolConfig, ToolRisk, ToolDefinition } from "@vinhnt-sdk/tools";
export type { ToolContext, ToolHook, ToolProvider } from "@vinhnt-sdk/tools";

// === Re-export essential types from knowledge ===

/**
 * Bounded memory store with size limits.
 */
export { BoundedMemory, ContextCompressor } from "@vinhnt-sdk/knowledge";

/**
 * Memory system types.
 */
export type { MemoryItem, MemoryStore } from "@vinhnt-sdk/knowledge";

// === Re-export essential types from security ===

/**
 * Redact secrets from text.
 */
export { redactSecrets, detectSecrets } from "@vinhnt-sdk/security";
