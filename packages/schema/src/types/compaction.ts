import type { CompressionSummary } from "@vinhnt-sdk/schema";
import type { ChatMessage } from "@vinhnt-sdk/schema";

export interface ConversationCompactor {
  compact(
    messages: readonly ChatMessage[],
    signal?: AbortSignal,
  ): Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary }>;
}
