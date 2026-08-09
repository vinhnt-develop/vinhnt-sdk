// @vinhnt-sdk/core
// Core agent engine for building AI coding agents
//
// PUBLIC API - Only essential exports for users
// Internal implementation details are NOT exported here

// === Kernel (core runtime) ===
export { AgentKernel, KernelError } from "./kernel/kernel.js";
export type { AgentKernelConfig, RunHandle } from "./kernel/kernel-types.js";

// === Agent system ===
export { createAgent } from "./agent/agent-factory.js";
export type { CreateAgentParams } from "./agent/agent-factory.js";

// === Event bus ===
export { InMemoryEventBus } from "./event-bus/in-memory-bus.js";
export type { EventBus, EventHandler, Unsubscribe } from "./event-bus/types.js";

// === Session management ===
export { InMemorySessionState } from "./session/in-memory-session-state.js";
export { SessionRunCoordinator } from "./session/run-coordinator.js";
export type { RunEventStore, SessionStore } from "./session/store.js";

// === Agent registry ===
export { InMemoryAgentRegistry } from "./agent/agent-registry.js";
export type { AgentRegistry } from "./agent/agent-registry.js";

// === Model registry ===
export { InMemoryModelRegistry } from "./model.js";
export type { ModelProvider, ModelRequest, ModelResponse, ModelStreamEvent } from "./model.js";

// === Permission stores ===
export { InMemoryApprovalStore } from "./permission/saved.js";
export type { ApprovalStore } from "./permission/saved.js";

// === Workspace ===
export { WorkspaceManager } from "./workspace.js";

// === Skill system ===
export { InMemorySkillDefRegistry } from "./skill/skill-def-registry.js";

// === Tracing ===
export { Tracer } from "./tracer.js";

// === Logger ===
export { setLogger, setLogLevel, getLogger } from "./logger.js";
export type { Logger, LogLevel } from "./logger.js";

// === Plugin system ===
export type { PluginManifest, PluginContext, PluginHooks, Plugin } from "./plugin.js";
export type { ContextSourceValue, ContextSourceKey } from "./system-context/types.js";

// === Re-export essential types from schema ===
export type {
  RunId, SessionId, AgentId, TraceId, RequestId,
  RunStatus, RequestContext,
  AgentConfig, AgentProfile,
  Session, Message,
} from "@vinhnt-sdk/schema";
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
export type { VntErrorCtx } from "@vinhnt-sdk/schema";

// === Re-export essential types from tools ===
export { defineTool, ToolRegistry } from "@vinhnt-sdk/tools";
export type { Tool, ToolConfig, ToolRisk, ToolDefinition } from "@vinhnt-sdk/tools";
export type { ToolContext, ToolHook, ToolProvider } from "@vinhnt-sdk/tools";

// === Re-export essential types from knowledge ===
export { BoundedMemory, ContextCompressor } from "@vinhnt-sdk/knowledge";
export type { MemoryItem, MemoryStore } from "@vinhnt-sdk/knowledge";

// === Re-export essential types from security ===
export { redactSecrets, detectSecrets } from "@vinhnt-sdk/security";
