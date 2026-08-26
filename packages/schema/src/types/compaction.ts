import type { CompressionSummary } from "@vinhnt-sdk/schema";
import type { ChatMessage } from "@vinhnt-sdk/schema";

/**
 * Prefix marking a persisted summary marker message in a SessionStore. When a
 * run compacts its context, a `system` message whose content starts with this
 * prefix is written durably; history reload (`restoreRunFromStore`) drops every
 * message before the LAST such marker and rebuilds from the compacted point.
 * (RV-15 — durable compaction survives process restart.)
 */
export const COMPACTION_SUMMARY_PREFIX = "[vnt-compaction-summary]\n";

/** Abstract conversation compactor: compresses a transcript and reports the result. */
export interface ConversationCompactor {
  compact(
    messages: readonly ChatMessage[],
    signal?: AbortSignal,
  ): Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary }>;
}
