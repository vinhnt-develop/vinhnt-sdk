import type { CompressionSummary, ChatMessage, ConversationCompactor } from "@vinhnt-sdk/schema";
import { getTextContent } from "@vinhnt-sdk/schema";

export interface CompressorOptions {
  /** Always protect this many messages at start */
  readonly headCount: number;
  /** Always protect this many messages at end */
  readonly tailCount: number;
  /** Truncate tool output beyond this length (0 = no truncation) */
  readonly maxToolOutputLength: number;
  /** Token budget — if exceeded, force compression */
  readonly tokenBudget: number;
  /** Approximate tokens per character */
  readonly charsPerToken: number;
}

const DEFAULT_OPTS: CompressorOptions = {
  headCount: 3,
  tailCount: 20,
  maxToolOutputLength: 500,
  tokenBudget: 32000,
  charsPerToken: 4,
};

function approximateTokens(text: string, charsPerToken = 4): number {
  return Math.ceil(text.length / charsPerToken);
}

function truncateToolOutput(msg: ChatMessage, maxLen: number): ChatMessage {
  if (msg.role !== "tool") return msg;
  const text = getTextContent(msg.content);
  if (text.length <= maxLen) return msg;
  return { ...msg, content: text.slice(0, maxLen) + "... [truncated]" };
}

export class ContextCompressor implements ConversationCompactor {
  private opts: CompressorOptions;

  constructor(opts?: Partial<CompressorOptions>) {
    this.opts = { ...DEFAULT_OPTS, ...opts };
  }

  /**
   * Phase 1: Prune verbose old tool outputs.
   */
  pruneToolOutputs(messages: readonly ChatMessage[]): readonly ChatMessage[] {
    return messages.map((m) => truncateToolOutput(m, this.opts.maxToolOutputLength));
  }

  /**
   * Determine if compression is needed based on token budget.
   */
  needsCompression(messages: readonly ChatMessage[]): boolean {
    const total = messages.reduce((sum, m) => sum + approximateTokens(getTextContent(m.content), this.opts.charsPerToken), 0);
    return total > this.opts.tokenBudget;
  }

  /**
   * Compress middle messages (head/tail protection + naive summarization).
   * Implements ConversationCompactor.
   */
  async compact(
    messages: readonly ChatMessage[],
    _signal?: AbortSignal,
  ): Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary }> {
    return this.compress(messages);
  }

  /**
   * Phase 2-4: Synchronous compress.
   * - Protects headCount messages at start
   * - Protects tailCount messages at end
   * - Summarizes middle portion
   */
  compress(messages: readonly ChatMessage[]): {
    messages: readonly ChatMessage[];
    summary: CompressionSummary;
  } {
    const originalCount = messages.length;
    const pruned = this.pruneToolOutputs(messages);

    if (pruned.length <= this.opts.headCount + this.opts.tailCount) {
      return {
        messages: pruned,
        summary: {
          originalMessageCount: originalCount,
          compressedMessageCount: pruned.length,
          summary: undefined,
        },
      };
    }

    const head = pruned.slice(0, this.opts.headCount);
    const tail = pruned.slice(-this.opts.tailCount);
    const middle = pruned.slice(this.opts.headCount, -this.opts.tailCount);

    const middleContent = middle
      .map((m) => `[${m.role}] ${getTextContent(m.content).slice(0, 200)}`)
      .join("\n");
    const summary = middle.length > 0
      ? `[Compressed ${middle.length} messages] ${middleContent.slice(0, 1000)}`
      : undefined;

    const result: ChatMessage[] = [
      ...head,
      ...(summary ? [{ role: "system" as const, content: `--- compressed context: ${summary.slice(0, 300)} ---` }] : []),
      ...tail,
    ];

    return {
      messages: result,
      summary: {
        originalMessageCount: originalCount,
        compressedMessageCount: result.length,
        summary,
      },
    };
  }
}
