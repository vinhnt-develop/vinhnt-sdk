import type { ModelProvider, ModelRequest, ModelResponse, ModelStreamEvent, ModelPricing } from "../model.js";

/**
 * FakeModelProvider — Mock LLM provider for unit tests.
 *
 * Takes a queue of responses and returns them in order.
 * When the queue is exhausted, uses fallbackResponse if provided,
 * or echoes back the user message.
 *
 * Usage:
 * ```ts
 * // Fixed queue
 * const model = new FakeModelProvider([
 *   { content: "Hello!" },
 *   { content: "", toolCalls: [{ id: "c1", name: "read", args: {} }] },
 * ]);
 *
 * // Echo mode — always echoes back user message
 * const echo = new FakeModelProvider([], { echoPrefix: "[ECHO] " });
 * ```
 */
export class FakeModelProvider implements ModelProvider {
  readonly provider = "fake";
  readonly model = "fake-model";
  readonly pricing: ModelPricing = { input: 1.0, output: 2.0 };
  readonly contextLimit: number | undefined = undefined;
  readonly capabilities = {
    streaming: true,
    toolCalling: true,
    imageInput: false,
    thinking: false,
    structuredOutput: false,
  } as const;
  /** Track number of generate() calls (useful for verifying which model was used) */
  generated = 0;
  private index = 0;

  constructor(
    private readonly responses: ModelResponse[],
    private readonly options?: { echoPrefix?: string },
  ) {}

  async *stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
    const response = await this.generate(request, signal);
    if (response.content) {
      yield { type: "text", content: response.content };
    }
    if (response.toolCalls) {
      for (const tc of response.toolCalls) {
        yield { type: "tool_call", id: tc.id, name: tc.name, args: tc.args as Record<string, unknown> };
      }
    }
    yield { type: "done" };
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async generate(request: ModelRequest, _signal?: AbortSignal): Promise<ModelResponse> {
    this.generated++;
    // Return response from queue if available
    if (this.index < this.responses.length) {
      return this.responses[this.index++] as ModelResponse;
    }

    // Fallback: echo the last user message
    const lastMsg = request.messages.filter((m) => m.role === "user").at(-1);
    const prefix = this.options?.echoPrefix ?? "[FakeModelProvider] ";
    const content = lastMsg
      ? `${prefix}${lastMsg.content}`
      : `${prefix}(no user message)`;

    return { content };
  }
}
