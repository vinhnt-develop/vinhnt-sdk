// @vinhnt-sdk/knowledge
// Memory and context management for AI coding agents
//
// PUBLIC API - Only essential exports for users

// === Memory system ===
export { InMemoryMemoryStore, SessionMemory } from "./memory.js";
export { BoundedMemory } from "./memory-bounded.js";
export type { MemoryItem, MemoryStore, MemoryTier } from "./types.js";

// === Context compression ===
export { ContextCompressor } from "./compressor.js";
export { LlmCompactor } from "./llm-compactor.js";

// === Prompt building ===
export { buildPrompt } from "./prompt-builder.js";
export type { PromptBuilderOptions } from "./prompt-builder.js";

// === Memory search tool ===
export { createMemorySearchTool } from "./tool.js";

// === Review & approval ===
export { WriteApprovalQueue } from "./approval.js";
export type { ApprovalHandler } from "./approval.js";
export { BackgroundReview } from "./review.js";
export type { ReviewOptions } from "./review.js";

// === Learning engine ===
export { LearningEngine } from "./learning-engine.js";
export type { LearningEngineOptions } from "./learning-engine.js";
