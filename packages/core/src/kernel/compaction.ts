import type { ChatMessage } from "../model.js";
import type { ConversationCompactor, SessionRuntimeState } from "@vinhnt-sdk/session";
import type { PluginManager } from "../plugin.js";
import {
  COMPACTION_SUMMARY_PREFIX,
  approximateTokensFromCharCount,
  getLogger,
  getTextContent,
} from "@vinhnt-sdk/schema";
import { DEFAULT_CONTEXT_WINDOW } from "@vinhnt-sdk/llm";
import { DEFAULT_COMPACTION_THRESHOLD } from "../context/context-budget.js";

/** Why a compaction request did not replace the transcript. */
export type CompactionSkipReason =
  | "no_compactor"
  | "below_threshold"
  | "no_reduction"
  | "stale_generation"
  | "active_run";

export interface CompactionOutcome {
  readonly didCompact: boolean;
  readonly originalCount: number;
  readonly compressedCount: number;
  readonly reason?: CompactionSkipReason;
}

export interface CompactMessagesOptions {
  readonly messages: readonly ChatMessage[];
  readonly runModel: {
    readonly countTokens?: ((content: string) => number) | undefined;
    readonly contextLimit?: number | undefined;
  };
  readonly compactor?: ConversationCompactor;
  /** Bypass the token threshold. */
  readonly force?: boolean;
  readonly trigger?: "auto" | "manual";
  readonly contextBudget?: { readonly compactionThreshold: number };
  readonly compactionThreshold?: number;
  readonly pluginManager?: PluginManager;
  readonly signal: AbortSignal;
  readonly sessionId?: string;
  readonly state?: SessionRuntimeState;
  readonly addSessionMessage: (
    sid: string | undefined,
    role: string,
    content: string,
    extra?: Record<string, unknown>,
  ) => Promise<void>;
  readonly emitCompressed?: (data: {
    originalCount: number;
    compressedCount: number;
    summary?: string;
    trigger: "auto" | "manual";
  }) => Promise<void>;
}

export interface CompactMessagesResult {
  readonly messages: ChatMessage[];
  readonly outcome: CompactionOutcome;
}

/** Estimate the input tokens used by text and tool-call args. */
export function estimateInputTokens(
  messages: readonly ChatMessage[],
  runModel: { readonly countTokens?: ((content: string) => number) | undefined },
): number {
  if (runModel.countTokens) {
    return messages.reduce((sum, message) => {
      let tokens = runModel.countTokens!(getTextContent(message.content));
      if (message.toolCalls && message.toolCalls.length > 0) {
        tokens += runModel.countTokens!(JSON.stringify(message.toolCalls));
      }
      return sum + tokens;
    }, 0);
  }

  let chars = 0;
  for (const message of messages) {
    chars += getTextContent(message.content).length;
    if (message.toolCalls && message.toolCalls.length > 0) {
      chars += JSON.stringify(message.toolCalls).length;
    }
  }
  return approximateTokensFromCharCount(chars);
}

/** Decide whether the estimated input crosses the configured compaction ratio. */
export function shouldCompactMessages(
  messages: readonly ChatMessage[],
  runModel: {
    readonly countTokens?: ((content: string) => number) | undefined;
    readonly contextLimit?: number | undefined;
  },
  options: {
    readonly contextBudget?: { readonly compactionThreshold: number };
    readonly compactionThreshold?: number;
  } = {},
): boolean {
  const contextWindow = runModel.contextLimit ?? DEFAULT_CONTEXT_WINDOW;
  const ratio =
    options.contextBudget?.compactionThreshold ??
    options.compactionThreshold ??
    DEFAULT_COMPACTION_THRESHOLD;
  return estimateInputTokens(messages, runModel) > Math.floor(contextWindow * ratio);
}

/** Stable-enough fallback when a custom state does not expose `generation`. */
function stateToken(state: SessionRuntimeState | undefined): string {
  if (!state) return "none";
  if (typeof state.generation === "number") return `generation:${state.generation}`;
  const current = state.messages;
  const last = current[current.length - 1];
  return `fallback:${current.length}:${last?.role ?? ""}:${last ? getTextContent(last.content).slice(0, 64) : ""}`;
}

/**
 * Run one compaction pass and persist/emit the durable summary marker.
 *
 * The state generation is captured before the (async) compactor runs and
 * checked again before the result is accepted. If a concurrent turn mutated
 * the state in the meantime the result is discarded instead of overwriting the
 * newer transcript. The caller applies `messages` to the runtime state.
 */
export async function compactMessages(
  options: CompactMessagesOptions,
): Promise<CompactMessagesResult> {
  const originalCount = options.messages.length;
  if (!options.compactor) {
    return {
      messages: [...options.messages],
      outcome: { didCompact: false, originalCount, compressedCount: originalCount, reason: "no_compactor" },
    };
  }

  const force = options.force === true;
  if (!force && !shouldCompactMessages(options.messages, options.runModel, options)) {
    return {
      messages: [...options.messages],
      outcome: { didCompact: false, originalCount, compressedCount: originalCount, reason: "below_threshold" },
    };
  }

  const trigger = options.trigger ?? (force ? "manual" : "auto");
  const tokenBefore = stateToken(options.state);

  // Read-only lifecycle hook — bad plugins cannot break compaction.
  await options.pluginManager?.fireHook("onPreCompact", {
    trigger,
    messageCount: originalCount,
    ...(options.sessionId !== undefined ? { sessionId: options.sessionId } : {}),
  });

  const compacted = await options.compactor.compact(options.messages, options.signal);

  if (stateToken(options.state) !== tokenBefore) {
    return {
      messages: [...options.messages],
      outcome: {
        didCompact: false,
        originalCount,
        compressedCount: compacted.summary.compressedMessageCount,
        reason: "stale_generation",
      },
    };
  }

  const compressedCount = compacted.summary.compressedMessageCount;
  if (!(compressedCount < originalCount)) {
    return {
      messages: [...options.messages],
      outcome: { didCompact: false, originalCount, compressedCount, reason: "no_reduction" },
    };
  }

  await options.emitCompressed?.({
    originalCount,
    compressedCount,
    ...(compacted.summary.summary ? { summary: compacted.summary.summary } : {}),
    trigger,
  });

  await options.pluginManager?.fireHook("onContextCompressed", {
    originalCount,
    compressedCount,
  });

  if (options.sessionId) {
    const summaryText = compacted.summary.summary
      ? `${COMPACTION_SUMMARY_PREFIX}${compacted.summary.summary}`
      : `${COMPACTION_SUMMARY_PREFIX}Compressed ${originalCount} -> ${compressedCount} messages`;
    try {
      await options.addSessionMessage(options.sessionId, "system", summaryText);
    } catch (err) {
      getLogger().warn(
        "[compaction] Failed to persist compaction summary:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return {
    messages: [...compacted.messages],
    outcome: { didCompact: true, originalCount, compressedCount },
  };
}
