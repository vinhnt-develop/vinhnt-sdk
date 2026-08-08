import type { CompressionSummary, ChatMessage, ModelProvider, ConversationCompactor } from "@vinhnt-sdk/schema";

export interface LlmCompactorOptions {
  /** Always protect this many messages at start */
  readonly headCount: number;
  /** Always protect this many messages at end */
  readonly tailCount: number;
  /** Token budget — if exceeded, force compression */
  readonly tokenBudget: number;
  /** Approximate tokens per character (for budget check) */
  readonly charsPerToken: number;
  /** System prompt for summarization */
  readonly summaryPrompt: string;
}

const DEFAULT_OPTS: LlmCompactorOptions = {
  headCount: 3,
  tailCount: 20,
  tokenBudget: 32000,
  charsPerToken: 4,
  summaryPrompt:
    "Summarize the following conversation history concisely. " +
    "Preserve key decisions, tool results, user requirements, and any important context. " +
    "Output only the summary, no preamble.",
};

function approximateTokens(text: string, charsPerToken: number): number {
  return Math.ceil(text.length / charsPerToken);
}

export class LlmCompactor implements ConversationCompactor {
  private readonly model: ModelProvider;
  private readonly opts: LlmCompactorOptions;

  constructor(model: ModelProvider, opts?: Partial<LlmCompactorOptions>) {
    this.model = model;
    this.opts = { ...DEFAULT_OPTS, ...opts };
  }

  async compact(
    messages: readonly ChatMessage[],
    signal?: AbortSignal,
  ): Promise<{ messages: readonly ChatMessage[]; summary: CompressionSummary }> {
    const originalCount = messages.length;

    if (messages.length <= this.opts.headCount + this.opts.tailCount) {
      return {
        messages,
        summary: {
          originalMessageCount: originalCount,
          compressedMessageCount: originalCount,
          summary: undefined,
        },
      };
    }

    const totalTokens = messages.reduce(
      (sum, m) => sum + approximateTokens(m.content, this.opts.charsPerToken), 0,
    );

    if (totalTokens <= this.opts.tokenBudget) {
      return {
        messages,
        summary: {
          originalMessageCount: originalCount,
          compressedMessageCount: originalCount,
          summary: undefined,
        },
      };
    }

    const head = messages.slice(0, this.opts.headCount);
    const tail = messages.slice(-this.opts.tailCount);
    const middle = messages.slice(this.opts.headCount, -this.opts.tailCount);

    const middleText = middle
      .map((m) => {
        const roleLabel = m.role === "tool" ? `tool result (${m.toolCallId ?? "?"})` : m.role;
        return `[${roleLabel}] ${m.content}`;
      })
      .join("\n\n");

    const llmResponse = await this.model.generate(
      {
        messages: [
          { role: "system", content: this.opts.summaryPrompt },
          { role: "user", content: middleText },
        ],
        tools: [],
        maxTokens: 1024,
      },
      signal,
    );

    const compactedContent = llmResponse.content.trim() || "(summary unavailable)";

    const result: ChatMessage[] = [
      ...head,
      {
        role: "system",
        content: `--- compressed context: ${compactedContent} ---`,
      },
      ...tail,
    ];

    return {
      messages: result,
      summary: {
        originalMessageCount: originalCount,
        compressedMessageCount: result.length,
        summary: compactedContent,
      },
    };
  }
}
