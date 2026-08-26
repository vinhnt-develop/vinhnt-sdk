/**
 * Session Service Definition — the capability seam for session persistence.
 *
 * This module defines the abstract contract (Service Definition) that
 * store providers implement. The actual stores (memory, drizzle, etc.)
 * are separate packages that implement these interfaces.
 *
 * Capability Seam:
 *   Service Definition (this module) → Provider (store-memory, store-drizzle) → Consumer (core kernel)
 */

// Re-export store interfaces from schema (single source of truth)
export type {
  RunEventSnapshot,
  RunEventListener,
  SessionUpdates,
  RunEventStore,
  SessionStore,
  MessageSeqUpdates,
} from "@vinhnt-sdk/schema";

// Service Definition — SessionProvider
export type { SessionProvider, SessionProviderConfig } from "./provider.js";

// Re-export store implementations (for backward compatibility)
export { NullRunEventStore, NullSessionStore } from "./null-store.js";

// Runtime session state
export type { SessionRuntimeState, SessionRuntimeSnapshot } from "./session-state.js";
export { InMemorySessionState } from "./in-memory-session-state.js";

// Durable reload
export type { RestoredRun } from "./durable-reload.js";
export { restoreRunFromStore, findActiveSessionIds } from "./durable-reload.js";

// Session tree
export type { SessionTree } from "./session-tree.js";
export { InMemorySessionTree } from "./session-tree.js";

// Compaction
export type { ConversationCompactor } from "./compaction.js";

// Title generation
export { TITLE_INPUT_TRUNCATION, TITLE_MAX_TOKENS, TITLE_OUTPUT_TRUNCATION, TITLE_SYSTEM_PROMPT, createDefaultSessionTitleGenerator } from "./title.js";
