/**
 * @module session
 * Session runtime state, run event stores, durable reload and title generation.
 */

// Store contracts (re-exported from @vinhnt-sdk/schema for backward compatibility)
export type {
  RunEventSnapshot,
  RunEventListener,
  SessionUpdates,
  RunEventStore,
  SessionStore,
} from "./store.js";

// Runtime session state
export type { SessionRuntimeState, SessionRuntimeSnapshot } from "./session-state.js";
export { InMemorySessionState } from "./in-memory-session-state.js";

// Store implementations
export { NullRunEventStore, NullSessionStore } from "./null-store.js";

// Durable reload
export type { RestoredRun } from "./durable-reload.js";
export { restoreRunFromStore, findActiveSessionIds } from "./durable-reload.js";

// Session tree
export type { SessionTree } from "./session-tree.js";
export { InMemorySessionTree } from "./session-tree.js";

// Compaction
export type { ConversationCompactor } from "./compaction.js";

// Title generation
/** Max characters of the user message passed to the model for title generation. */
export const TITLE_INPUT_TRUNCATION = 200;
/** Max tokens allowed for the generated title. */
export const TITLE_MAX_TOKENS = 30;
/** Max characters of the final title after post-processing. */
export const TITLE_OUTPUT_TRUNCATION = 80;
/** System prompt instructing the model to produce a concise session title. */
export const TITLE_SYSTEM_PROMPT = "Generate a concise session title (max 8 words) from this user message. Respond with ONLY the title, no quotes, no punctuation.";
export { createDefaultSessionTitleGenerator } from "./title.js";
