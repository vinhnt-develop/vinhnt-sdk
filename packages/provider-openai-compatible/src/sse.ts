/**
 * SSE parsing for OpenAI-compatible streaming (`/chat/completions` with
 * `stream: true`), plus tool-call delta assembly into vinhnt-sdk
 * `ModelStreamEvent`s.
 */

import type {
  OpenAIStreamChunk,
  OpenAIStreamChoice,
  ModelStreamEvent,
} from "@vinhnt-sdk/schema";

type Bytes = ReadableStream<Uint8Array>;

const DONE_MARKER = "[DONE]";

/** Mutable state shared between the SSE parser and its consumer. */
export interface SSEParseState {
  /** Set to true when the `[DONE]` terminator was observed. */
  sawDone: boolean;
}

function tryParse(text: string): unknown | undefined {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Parse an SSE byte stream into OpenAI streaming chunks.
 *
 * Handles: `data:` lines, `[DONE]` termination, multi-line JSON events and
 * providers that omit the blank-line event delimiter. `state.sawDone` flips to
 * true when the `[DONE]` terminator is seen, letting the consumer distinguish
 * a clean completion from a truncated stream that closed without it.
 */
export async function* createSSEStream(
  body: Bytes,
  signal?: AbortSignal,
  state?: SSEParseState,
): AsyncIterable<OpenAIStreamChunk> {
  const decoder = new TextDecoder();
  let buffer = "";
  let pending: string[] = [];

  for await (const chunk of body) {
    if (signal?.aborted) return;
    buffer += decoder.decode(chunk, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
      buffer = buffer.slice(newlineIndex + 1);

      if (line.startsWith("data:")) {
        const payload = line.slice(5).trimStart();
        if (payload === DONE_MARKER) {
          if (state) state.sawDone = true;
          const flushed = flushPending();
          if (flushed !== undefined) yield flushed;
          return;
        }
        if (payload) {
          pending.push(payload);
          // Single-line JSON (OpenAI & most compatibles): parse and emit now.
          const parsed = tryParse(pending.join(""));
          if (parsed !== undefined) {
            yield parsed as OpenAIStreamChunk;
            pending = [];
          }
        }
      } else if (line === "") {
        const flushed = flushPending();
        if (flushed !== undefined) yield flushed;
      }
    }
  }

  // Tail without a trailing newline.
  if (buffer) {
    const tail = buffer.replace(/\r$/, "");
    if (tail.startsWith("data:")) {
      const payload = tail.slice(5).trimStart();
      if (payload && payload !== DONE_MARKER) pending.push(payload);
    }
  }
  const tail = flushPending();
  if (tail !== undefined) yield tail;

  function flushPending(): OpenAIStreamChunk | undefined {
    if (pending.length === 0) return undefined;
    const parsed = tryParse(pending.join("\n")) ?? tryParse(pending.join(""));
    pending = [];
    return parsed as OpenAIStreamChunk | undefined;
  }
}

// ── Tool-call delta assembly ──

interface AssembledToolCall {
  readonly index: number;
  id: string;
  name: string;
  argsBuffer: string;
}

function safeParseArgs(buffer: string): Record<string, unknown> {
  if (!buffer.trim()) return {};
  try {
    const parsed = JSON.parse(buffer) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Convert an OpenAI streaming chunk into a list of parsed fields for the
 * streaming assembler. Straightforward per-choice parsing; tool call
 * arguments are raw deltas that the caller accumulates. Non-chunk frames
 * (mid-stream error/status objects) are surfaced as `error` instead of
 * crashing on `chunk.choices` being undefined.
 */
function chunkToDeltas(chunk: OpenAIStreamChunk): {
  texts: string[];
  reasonings: string[];
  toolCalls: OpenAIStreamChoice["delta"]["tool_calls"];
  finishReason: string | null;
  usage: { inputTokens: number; outputTokens: number; reasoningTokens?: number } | undefined;
  error: string | undefined;
} {
  const texts: string[] = [];
  const reasonings: string[] = [];
  let toolCalls: OpenAIStreamChoice["delta"]["tool_calls"] = [];
  let finishReason: string | null = null;
  if (!Array.isArray(chunk.choices)) {
    // Mid-stream status/error object — not a chat.completion chunk.
    const raw = (chunk as unknown as { error?: { message?: string } }).error;
    return {
      texts,
      reasonings,
      toolCalls,
      finishReason,
      usage: undefined,
      error: raw?.message
        ? raw.message
        : "Provider stream returned a frame that is not a chat.completion chunk",
    };
  }
  for (const choice of chunk.choices) {
    if (!choice || !choice.delta) {
      // A choice without a delta (e.g. a final usage-only chunk) carries nothing.
      continue;
    }
    if (choice.delta.content !== null && choice.delta.content !== undefined) {
      texts.push(choice.delta.content);
    }
    // RV-44: DeepSeek reasoner streams chain-of-thought via `reasoning_content`
    // instead of `content` — capture it so it is surfaced, not dropped.
    if (
      choice.delta.reasoning_content !== null &&
      choice.delta.reasoning_content !== undefined &&
      choice.delta.reasoning_content !== ""
    ) {
      reasonings.push(choice.delta.reasoning_content);
    }
    if (choice.delta.tool_calls) toolCalls = [...toolCalls, ...choice.delta.tool_calls];
    if (choice.finish_reason !== null) finishReason = choice.finish_reason;
  }
  return {
    texts,
    reasonings,
    toolCalls,
    finishReason,
    usage: chunk.usage ? {
      inputTokens: chunk.usage.prompt_tokens,
      outputTokens: chunk.usage.completion_tokens,
      ...(chunk.usage.completion_tokens_details?.reasoning_tokens
        ? { reasoningTokens: chunk.usage.completion_tokens_details.reasoning_tokens }
        : {}),
    } : undefined,
    error: undefined,
  };
}

/**
 * Assemble an OpenAI SSE stream into vinhnt-sdk `ModelStreamEvent`s.
 *
 * Accumulates fragmented tool-call argument deltas across chunks and emits
 * one complete `tool_call` event per call, then `done`.
 */
export async function* toModelStreamEvents(
  body: Bytes,
  signal?: AbortSignal,
): AsyncIterable<ModelStreamEvent> {
  const assembled = new Map<number, AssembledToolCall>();
  const parseState: SSEParseState = { sawDone: false };

  for await (const chunk of createSSEStream(body, signal, parseState)) {
    const { texts, reasonings, toolCalls, finishReason, usage, error } = chunkToDeltas(chunk);

    if (error) {
      // Stop assembling: the stream is unusable past this frame.
      yield { type: "error", error };
      return;
    }

    for (const text of texts) {
      yield { type: "text", content: text };
    }

    // RV-44: surface DeepSeek chain-of-thought as distinct thinking events.
    for (const thought of reasonings) {
      yield { type: "thinking", content: thought };
    }

    if (toolCalls) {
      for (const tc of toolCalls) {
        const slot = assembled.get(tc.index);
        if (slot) {
          if (tc.id) slot.id = tc.id;
          if (tc.function?.name) slot.name = tc.function.name;
          if (tc.function?.arguments) slot.argsBuffer += tc.function.arguments;
        } else {
          assembled.set(tc.index, {
            index: tc.index,
            id: tc.id ?? "",
            name: tc.function?.name ?? "",
            argsBuffer: tc.function?.arguments ?? "",
          });
        }
      }
    }

    if (finishReason) {
      yield { type: "finish", reason: finishReason };
    }

    if (usage) {
      yield {
        type: "usage",
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        ...(usage.reasoningTokens !== undefined ? { reasoningTokens: usage.reasoningTokens } : {}),
      };
    }
  }

  // A clean OpenAI stream always ends with `[DONE]`. If the body closed
  // without it (connection drop / server truncation), the partial result must
  // not be committed as a normal `done`.
  if (!parseState.sawDone && !signal?.aborted) {
    yield { type: "error", error: "Stream ended without the [DONE] terminator" };
    return;
  }

  for (const tc of assembled.values()) {
    if (tc.id) {
      yield { type: "tool_call", id: tc.id, name: tc.name, args: safeParseArgs(tc.argsBuffer) };
    }
  }

  yield { type: "done" };
}