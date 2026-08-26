import { describe, expect, it } from "vitest";
import type { ModelRequest } from "@vinhnt-sdk/schema";
import { OpenAICompatibleProvider } from "../src/openai-compatible-provider.js";
import { buildRequest } from "../src/build-request.js";
import { toUpstreamError, UpstreamError } from "../src/error.js";
import { RETRYABLE_STATUSES } from "../src/error.js";

const encoder = new TextEncoder();

function fullRequest(): ModelRequest {
  return {
    system: "You are a helpful agent.",
    messages: [
      { role: "user", content: "What is the weather in Hanoi?" },
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "tc-1", name: "get_weather", args: { city: "Hanoi" } }],
      },
      { role: "tool", toolCallId: "tc-1", content: '{"temp": 28}' },
    ],
    tools: [{
      id: "t1",
      description: "Get weather for a city",
      risk: "low",
      type: "function",
      function: {
        name: "get_weather",
        description: "Get weather for a city",
        parameters: { type: "object", properties: { city: { type: "string" } } },
      },
    }],
    toolChoice: "auto",
    maxCompletionTokens: 512,
    temperature: 0.7,
    topP: 0.9,
    streamOptions: { includeUsage: true },
    responseFormat: { type: "json_object" },
    presencePenalty: 0.1,
    frequencyPenalty: 0.2,
    user: "u-1",
    seed: 42,
  };
}

function provider(fetchImpl: typeof fetch) {
  return new OpenAICompatibleProvider({
    baseUrl: "https://api.example.com/v1",
    apiKey: "test-key",
    defaultModel: "model-x",
    fetchImpl,
  });
}

function jsonBody(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function sseBody(sse: string): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(encoder.encode(sse));
      c.close();
    },
  }), { status: 200 });
}

describe("Golden roundtrip — ModelRequest -> body -> response -> ModelResponse", () => {
  it("maps a full request body and a full OpenAI response", async () => {
    let capturedBody: unknown;
    const fetchMock = async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(String(init.body));
      return jsonBody({
        id: "chatcmpl-1",
        object: "chat.completion",
        created: 123,
        model: "model-x",
        system_fingerprint: "fp_1",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Hanoi"}' },
            }],
            refusal: null,
          },
          finish_reason: "tool_calls",
          logprobs: null,
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
          prompt_tokens_details: { cached_tokens: 3, audio_tokens: 0 },
          completion_tokens_details: { reasoning_tokens: 2, audio_tokens: 0 },
        },
      });
    };
    const p = provider(fetchMock as unknown as typeof fetch);

    const res = await p.generate(fullRequest());

    const body = capturedBody as Record<string, unknown>;
    expect(body.model).toBe("model-x");
    expect(body.stream).toBeUndefined();
    expect(body.stream_options).toBeUndefined();
    expect(body.max_completion_tokens).toBe(512);
    expect(body.temperature).toBe(0.7);
    expect(body.top_p).toBe(0.9);
    expect(body.tool_choice).toBe("auto");
    expect(body.presence_penalty).toBe(0.1);
    expect(body.frequency_penalty).toBe(0.2);
    expect(body.user).toBe("u-1");
    expect(body.seed).toBe(42);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toEqual([
      { role: "system", content: "You are a helpful agent." },
      { role: "user", content: "What is the weather in Hanoi?" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ id: "tc-1", type: "function", function: { name: "get_weather", arguments: '{"city":"Hanoi"}' } }],
      },
      { role: "tool", tool_call_id: "tc-1", content: '{"temp": 28}' },
    ]);
    expect(body.tools).toEqual([{
      type: "function",
      function: {
        name: "get_weather",
        description: "Get weather for a city",
        parameters: { type: "object", properties: { city: { type: "string" } } },
      },
    }]);

    expect(res.id).toBe("chatcmpl-1");
    expect(res.model).toBe("model-x");
    expect(res.systemFingerprint).toBe("fp_1");
    expect(res.content).toBe("");
    expect(res.finishReason).toBe("tool_calls");
    expect(res.toolCalls).toEqual([{ id: "call_1", name: "get_weather", args: { city: "Hanoi" } }]);
    expect(res.usage).toEqual(expect.objectContaining({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      cachedTokens: 3,
      reasoningTokens: 2,
      audioTokens: 0,
    }));
  });
});

describe("Golden roundtrip — ModelRequest -> SSE -> ModelStreamEvents", () => {
  it("assembles text, tool calls, usage and finish from a mock SSE stream", async () => {
    let capturedBody: unknown;
    const sse = [
      `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 1, model: "model-x", choices: [{ index: 0, delta: { role: "assistant", content: "The " }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "c2", object: "chat.completion.chunk", created: 1, model: "model-x", choices: [{ index: 0, delta: { content: "weather is " }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "c3", object: "chat.completion.chunk", created: 1, model: "model-x", choices: [{ index: 0, delta: { content: null, tool_calls: [{ index: 0, id: "call_1", function: { name: "get_weather" } }] }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "c4", object: "chat.completion.chunk", created: 1, model: "model-x", choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '{"city":"Hanoi' } }] }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "c5", object: "chat.completion.chunk", created: 1, model: "model-x", choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '"}' } }] }, finish_reason: "tool_calls" }], usage: { prompt_tokens: 8, completion_tokens: 3, total_tokens: 11 } })}`,
      "data: [DONE]",
      "",
    ].join("\n");
    const fetchMock = async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(String(init.body));
      return sseBody(sse);
    };
    const p = provider(fetchMock as unknown as typeof fetch);

    const events = [];
    for await (const evt of p.stream(fullRequest())) events.push(evt);

    const body = capturedBody as Record<string, unknown>;
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });

    expect(events).toEqual([
      { type: "text", content: "The " },
      { type: "text", content: "weather is " },
      { type: "finish", reason: "tool_calls" },
      { type: "usage", inputTokens: 8, outputTokens: 3 },
      { type: "tool_call", id: "call_1", name: "get_weather", args: { city: "Hanoi" } },
      { type: "done" },
    ]);
  });
});

describe("Golden error table — HTTP status -> VntError", () => {
  it.each([
    [400, "ERR_UPSTREAM_400", false],
    [401, "ERR_UPSTREAM_401", false],
    [403, "ERR_UPSTREAM_403", false],
    [404, "ERR_UPSTREAM_404", false],
    [408, "ERR_UPSTREAM_408", true],
    [409, "ERR_UPSTREAM_409", true],
    [425, "ERR_UPSTREAM_425", true],
    [429, "ERR_UPSTREAM_429", true],
    [500, "ERR_UPSTREAM_500", true],
    [502, "ERR_UPSTREAM_502", true],
    [503, "ERR_UPSTREAM_503", true],
    [504, "ERR_UPSTREAM_504", true],
  ])("status %i -> code %s, retryable %s", (status, code, retryable) => {
    const err = toUpstreamError(status, { error: { message: "boom" } });
    expect(err.code).toBe(code);
    expect(err.retryable).toBe(retryable);
  });

  it("the retryable set matches the golden table", () => {
    expect([...RETRYABLE_STATUSES].sort((a, b) => a - b)).toEqual([408, 409, 425, 429, 500, 502, 503, 504]);
  });

  it("includes the upstream message when available", () => {
    const err = toUpstreamError(503, { error: { message: "Model is overloaded" } });
    expect(err.message).toBe("Model is overloaded");
    expect(err).toMatchObject({ status: 503, retryAfterMs: undefined });
  });

  it("attaches retryAfterMs from the Retry-After header", () => {
    const headers = new Headers({ "retry-after": "120" });
    const err = toUpstreamError(503, undefined, headers) as UpstreamError;
    expect(err.retryAfterMs).toBe(120000);
  });
});