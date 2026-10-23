// @vinhnt-sdk/knowledge
// Memory and context management for AI coding agents
//
// PUBLIC API - Only essential exports for users

// === Memory system ===
export { InMemoryMemoryStore, SessionMemory } from "./memory.js";
export { BoundedMemory } from "./memory-bounded.js";
export type { MemoryItem, MemoryScope, MemoryScopeFilter, MemoryStore, MemoryTier } from "./types.js";

// === Token utilities ===
export { approximateTokens } from "./token-utils.js";

// === Context compression ===
export { ContextCompressor } from "./compressor.js";
export { LlmCompactor } from "./llm-compactor.js";

// === Prompt building ===
export { buildPrompt } from "./prompt-builder.js";
export type { PromptBuilderOptions } from "./prompt-builder.js";

// === Memory search tool ===
export { createMemorySearchTool } from "./tool.js";

// === Auto memory (Claude Code MEMORY.md style: capped index + lazy topic files) ===
export {
  AutoMemory,
  createNodeAutoMemoryFs,
  parseAutoMemoryIndex,
  renderAutoMemoryIndex,
  countAutoMemoryLines,
  enforceAutoMemoryLimits,
  addAutoMemoryEntry,
  removeAutoMemoryEntry,
  searchAutoMemory,
  autoMemoryTopicSlug,
  DEFAULT_AUTO_MEMORY_MAX_LINES,
  DEFAULT_AUTO_MEMORY_MAX_BYTES,
  DEFAULT_AUTO_MEMORY_INDEX_FILENAME,
  DEFAULT_AUTO_MEMORY_TOPICS_DIRNAME,
} from "./auto-memory.js";
export type {
  AutoMemorySection,
  AutoMemoryLimits,
  AutoMemoryRenderResult,
  AutoMemoryMatch,
  AutoMemoryConfig,
  AutoMemoryFs,
} from "./auto-memory.js";

// === Memory service (ADK MemoryService parity) ===
export { createMemoryService, createMemoryServiceSearchTool } from "./memory-service.js";
export type { MemoryService, MemoryServiceSearchOptions, MemoryServiceResult } from "./memory-service.js";

// === Review & approval ===
export { WriteApprovalQueue } from "./approval.js";
export type { ApprovalHandler } from "./approval.js";
export { BackgroundReview } from "./review.js";
export type { ReviewOptions } from "./review.js";

// === Learning engine ===
export { LearningEngine } from "./learning-engine.js";
export type { LearningEngineOptions } from "./learning-engine.js";
