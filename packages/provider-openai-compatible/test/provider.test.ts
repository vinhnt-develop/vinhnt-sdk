import { describe, expect, it, vi } from "vitest";
import type { ModelRequest } from "@vinhnt-sdk/schema";
import { OpenAICompatibleProvider } from "../src/openai-compatible-provider.js";
import type { RetryOptions } from "../src/error.js";
import { UpstreamError } from "../src/error.js";

const encoder = new TextEncoder();

function request(overrides: Partial<ModelRequest> = {}): ModelRequest {
  return { messages: [{ role: "user", content: "Hello" }], tools: [], ...overrides };
}

function jsonBody(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function sseBody(sse: string): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sse));
      controller.close();
    },
  }), { status: 200 });
}

function provider(fetchImpl: typeof fetch, retry?: RetryOptions) {
  return new OpenAICompatibleProvider({
    baseUrl: "https://api.example.com/v1",
    apiKey: "test-key",
    defaultModel: "model-x",
    fetchImpl,
    retry,
  });
}

describe("OpenAICompatibleProvider", () => {
  it("reports the default provider name", () => {
    const p = provider(vi.fn() as unknown as typeof fetch);
    expect(p.provider).toBe("openai-compatible");
  });

  it("reports a custom provider name for tip packages", () => {
    const p = new OpenAICompatibleProvider({
      baseUrl: "https://api.example.com/v1",
      apiKey: "k",
      defaultModel: "m",
      providerName: "deepseek",
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });
    expect(p.provider).toBe("deepseek");
  });
});

describe("OpenAICompatibleProvider.generate", () => {
  it("POSTs an OpenAI body to /chat/completions with Bearer auth", async () => {
    const fetchMock = vi.fn(async () => jsonBody({
      id: "resp-1", object: "chat.completion", created: 1, model: "model-x",
      choices: [{ index: 0, message: { role: "assistant", content: "hi" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }));
    const p = provider(fetchMock as unknown as typeof fetch);
    const model = "model-x";

    const res = await p.generate(request(), new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-key");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(model);
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
    expect(res.content).toBe("hi");
    expect(res.model).toBe("model-x");
    expect(res.usage).toEqual(expect.objectContaining({ promptTokens: 10, completionTokens: 5, totalTokens: 15 }));
  });

  it("maps tool calls from the response", async () => {
    const fetchMock = vi.fn(async () => jsonBody({
      id: "resp-2", object: "chat.completion", created: 1, model: "model-x",
      choices: [{ index: 0, message: {
        role: "assistant", content: null,
        tool_calls: [{ id: "t1", type: "function", function: { name: "read", arguments: '{"path":"a"}' } }],
      }, finish_reason: "tool_calls" }],
    }));
    const p = provider(fetchMock as unknown as typeof fetch);

    const res = await p.generate(request());
    expect(res.toolCalls).toEqual([{ id: "t1", name: "read", args: { path: "a" } }]);
    expect(res.finishReason).toBe("tool_calls");
  });

  it("retries a retryable status then succeeds", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonBody({ error: { message: "busy" } }, 503))
      .mockResolvedValueOnce(jsonBody({ id: "r", object: "chat.completion", created: 1, model: "model-x", choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }] }));
    const p = provider(fetchMock as unknown as typeof fetch, { maxRetries: 2, fixedBackoffMs: 1 });

    const res = await p.generate(request());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.content).toBe("ok");
  });

  it("exhausts retries and throws UpstreamError with ERR_UPSTREAM_*", async () => {
    const fetchMock = vi.fn(async () => jsonBody({ error: { message: "still busy" } }, 503));
    const p = provider(fetchMock as unknown as typeof fetch, { maxRetries: 2, fixedBackoffMs: 1 });

    await expect(p.generate(request())).rejects.toMatchObject({
      code: "ERR_UPSTREAM_503",
      retryable: true,
      status: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry 4xx errors", async () => {
    const fetchMock = vi.fn(async () => jsonBody({ error: { message: "invalid api key" } }, 401));
    const p = provider(fetchMock as unknown as typeof fetch, { maxRetries: 3 });

    await expect(p.generate(request())).rejects.toMatchObject({
      code: "ERR_UPSTREAM_401",
      retryable: false,
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws UpstreamError and honours Retry-After", async () => {
    const fetchMock = vi.fn(async () => jsonBody({ error: { message: "slow down" } }, 429, { "retry-after": "1" }));
    const p = provider(fetchMock as unknown as typeof fetch, { maxRetries: 1, fixedBackoffMs: 1 });

    const err = await p.generate(request()).catch((e: unknown) => e) as UpstreamError;
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.retryAfterMs).toBe(1000);
  });

  it("throws NetworkError when fetch rejects and retries are exhausted", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("ECONNREFUSED"); });
    const p = provider(fetchMock as unknown as typeof fetch, { maxRetries: 1, fixedBackoffMs: 1 });

    await expect(p.generate(request())).rejects.toMatchObject({
      name: "NetworkError",
      retryable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts do not retry", async () => {
    const fetchMock = vi.fn(async () => { throw new DOMException("aborted", "AbortError"); });
    const p = provider(fetchMock as unknown as typeof fetch, { maxRetries: 3 });
    const controller = new AbortController();
    controller.abort();

    await expect(p.generate(request(), controller.signal)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("OpenAICompatibleProvider.stream", () => {
  it("yields assembled model stream events from the SSE body", async () => {
    const sse = [
      `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 1, model: "model-x", choices: [{ index: 0, delta: { content: "Hel" }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "c2", object: "chat.completion.chunk", created: 1, model: "model-x", choices: [{ index: 0, delta: { content: "lo" }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "c3", object: "chat.completion.chunk", created: 1, model: "model-x", choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: "tc1", function: { name: "read" } }] }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "c4", object: "chat.completion.chunk", created: 1, model: "model-x", choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '{"p":"x' } }] }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "c5", object: "chat.completion.chunk", created: 1, model: "model-x", choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '"}' } }] }, finish_reason: "tool_calls" }], usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 } })}`,
      "data: [DONE]",
      "",
    ].join("\n");
    const fetchMock = vi.fn(async () => sseBody(sse));
    const p = provider(fetchMock as unknown as typeof fetch);

    const events = [];
    for await (const evt of p.stream(request())) events.push(evt);

    expect(events).toContainEqual({ type: "text", content: "Hel" });
    expect(events).toContainEqual({ type: "tool_call", id: "tc1", name: "read", args: { p: "x" } });
    expect(events).toContainEqual({ type: "usage", inputTokens: 3, outputTokens: 1 });
    expect(events).toContainEqual({ type: "finish", reason: "tool_calls" });
    expect(events[events.length - 1]).toEqual({ type: "done" });
  });

  it("throws UpstreamError when the streaming response is not ok", async () => {
    const fetchMock = vi.fn(async () => jsonBody({ error: { message: "nope" } }, 400));
    const p = provider(fetchMock as unknown as typeof fetch);

    await expect((async () => {
      for await (const _evt of p.stream(request())) { /* consume */ }
    })()).rejects.toMatchObject({ code: "ERR_UPSTREAM_400", retryable: false });
  });
});