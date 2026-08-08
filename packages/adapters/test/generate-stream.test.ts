import { describe, it, expect, vi, beforeEach } from "vitest";
import { AiSdkModelProvider } from "../src/ai-sdk-adapter.js";
import type { ModelRequest, ToolDefinition } from "@vinhnt-sdk/core";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => ({ chat: vi.fn(() => "mock-model") })),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn(() => "mock-model")),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => "mock-model")),
}));

import { generateText, streamText } from "ai";

function makeProvider(): AiSdkModelProvider {
  return new AiSdkModelProvider("openai", "gpt-4o", "sk-test");
}

describe("generate()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns text content on success", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "Hello, world!",
      toolCalls: undefined,
    } as never);

    const p = makeProvider();
    const req: ModelRequest = {
      messages: [{ role: "user", content: "Say hello" }],
      tools: [],
    };
    const res = await p.generate(req);

    expect(res.content).toBe("Hello, world!");
    expect(res.toolCalls).toBeUndefined();
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("returns toolCalls when tools are invoked", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "",
      toolCalls: [
        { toolCallId: "call_1", toolName: "get_weather", input: { city: "Hanoi" } },
      ],
    } as never);

    const p = makeProvider();
    const req: ModelRequest = {
      messages: [{ role: "user", content: "Weather?" }],
      tools: [{ id: "get_weather", description: "Get weather", execute: async () => ({}) } as ToolDefinition],
    };
    const res = await p.generate(req);

    expect(res.content).toBe("");
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls![0]!.name).toBe("get_weather");
    expect(res.toolCalls![0]!.args).toEqual({ city: "Hanoi" });
  });

  it("splits system messages from user messages", async () => {
    let capturedArgs: unknown = null;
    (generateText as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce((args: unknown) => {
      capturedArgs = args;
      return Promise.resolve({ text: "ok", toolCalls: undefined });
    });

    const p = makeProvider();
    const req: ModelRequest = {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hi" },
      ],
      tools: [],
    };
    await p.generate(req);

    const call = capturedArgs as Record<string, unknown>;
    expect(call.system).toBe("You are a helpful assistant.");
    expect(call.messages).toHaveLength(1);
    expect((call.messages as Array<Record<string, unknown>>)[0]!.role).toBe("user");
  });

  it("forwards AbortSignal", async () => {
    let capturedSignal: unknown = null;
    (generateText as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce((args: unknown) => {
      capturedSignal = (args as Record<string, unknown>).abortSignal;
      return Promise.resolve({ text: "ok", toolCalls: undefined });
    });

    const p = makeProvider();
    const controller = new AbortController();
    const req: ModelRequest = { messages: [{ role: "user", content: "hi" }], tools: [] };
    await p.generate(req, controller.signal);

    expect(capturedSignal).toBe(controller.signal);
  });

  it("handles tool-role messages correctly", async () => {
    let capturedMessages: unknown = null;
    (generateText as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce((args: unknown) => {
      capturedMessages = (args as Record<string, unknown>).messages;
      return Promise.resolve({ text: "result", toolCalls: undefined });
    });

    const p = makeProvider();
    const req: ModelRequest = {
      messages: [
        { role: "assistant", content: "", toolCalls: [{ id: "tc1", name: "f", args: {} }] },
        { role: "tool", content: '{"result":"ok"}', toolCallId: "tc1" },
      ],
      tools: [],
    };
    await p.generate(req);

    const msgs = capturedMessages as Array<Record<string, unknown>>;
    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.role).toBe("assistant");
    expect(msgs[1]!.role).toBe("tool");
  });

  it("returns empty content when generateText returns empty", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "",
      toolCalls: undefined,
    } as never);

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "" }], tools: [] };
    const res = await p.generate(req);
    expect(res.content).toBe("");
  });
});

describe("stream()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function collectStream(provider: AiSdkModelProvider, req: ModelRequest): Promise<unknown[]> {
    const events: unknown[] = [];
    for await (const ev of provider.stream(req)) {
      events.push(ev);
    }
    return events;
  }

  it("yields text-delta events and done", async () => {
    async function* mockStream() {
      yield { type: "text-delta", text: "Hello " };
      yield { type: "text-delta", text: "world!" };
    }
    vi.mocked(streamText).mockReturnValueOnce({
      fullStream: mockStream(),
    } as never);

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "Say hi" }], tools: [] };
    const events = await collectStream(p, req);

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ type: "text", content: "Hello " });
    expect(events[1]).toEqual({ type: "text", content: "world!" });
    expect(events[2]).toEqual({ type: "done" });
  });

  it("yields tool_call events", async () => {
    async function* mockStream() {
      yield { type: "tool-call", toolCallId: "call_1", toolName: "search", input: { q: "test" } };
    }
    vi.mocked(streamText).mockReturnValueOnce({
      fullStream: mockStream(),
    } as never);

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "Search" }], tools: [] };
    const events = await collectStream(p, req);

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "tool_call", id: "call_1", name: "search", args: { q: "test" } });
    expect(events[1]).toEqual({ type: "done" });
  });

  it("yields error event and stops", async () => {
    async function* mockStream() {
      yield { type: "error", error: "API rate limited" };
    }
    vi.mocked(streamText).mockReturnValueOnce({
      fullStream: mockStream(),
    } as never);

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "hi" }], tools: [] };
    const events = await collectStream(p, req);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "error", error: "API rate limited" });
  });

  it("handles interleaved text and tool calls", async () => {
    async function* mockStream() {
      yield { type: "text-delta", text: "Let me " };
      yield { type: "tool-call", toolCallId: "c1", toolName: "calc", input: { expr: "2+2" } };
      yield { type: "text-delta", text: " check..." };
    }
    vi.mocked(streamText).mockReturnValueOnce({
      fullStream: mockStream(),
    } as never);

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "Calculate" }], tools: [] };
    const events = await collectStream(p, req);

    expect(events).toHaveLength(4);
    expect(events[0]).toEqual({ type: "text", content: "Let me " });
    expect(events[1]).toEqual({ type: "tool_call", id: "c1", name: "calc", args: { expr: "2+2" } });
    expect(events[2]).toEqual({ type: "text", content: " check..." });
    expect(events[3]).toEqual({ type: "done" });
  });

  it("handles error in stream iteration (thrown)", async () => {
    async function* mockStream() {
      throw new Error("Connection lost");
    }
    vi.mocked(streamText).mockReturnValueOnce({
      fullStream: mockStream(),
    } as never);

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "hi" }], tools: [] };
    const events = await collectStream(p, req);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "error", error: "Connection lost" });
  });

  it("handles empty stream", async () => {
    async function* mockStream() {}
    vi.mocked(streamText).mockReturnValueOnce({
      fullStream: mockStream(),
    } as never);

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "hi" }], tools: [] };
    const events = await collectStream(p, req);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "done" });
  });

  it("splits system messages for stream", async () => {
    let capturedArgs: unknown = null;
    (streamText as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce((args: unknown) => {
      capturedArgs = args;
      async function* empty() {}
      return { fullStream: empty() };
    });

    const p = makeProvider();
    const req: ModelRequest = {
      messages: [
        { role: "system", content: "Be helpful." },
        { role: "user", content: "Hi" },
      ],
      tools: [],
    };
    await collectStream(p, req);

    const call = capturedArgs as Record<string, unknown>;
    expect(call.system).toBe("Be helpful.");
    expect(call.messages).toHaveLength(1);
  });

  it("retries streamText on retryable error", async () => {
    async function* textGen() { yield { type: "text-delta", text: "Hello" }; }
    vi.mocked(streamText)
      .mockRejectedValueOnce(Object.assign(new Error("429 Too Many Requests"), { status: 429 }))
      .mockResolvedValueOnce({ fullStream: textGen() } as never);

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "hi" }], tools: [] };
    const events: unknown[] = [];
    for await (const ev of p.stream(req)) {
      events.push(ev);
    }

    expect(streamText).toHaveBeenCalledTimes(2);
    expect(events[0]).toEqual({ type: "text", content: "Hello" });
    expect(events[1]).toEqual({ type: "done" });
  });

  it("retries streamText on TypeError (network error)", async () => {
    async function* textGen() { yield { type: "text-delta", text: "Recovered" }; }
    vi.mocked(streamText)
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockRejectedValueOnce(new TypeError("fetch failed again"))
      .mockResolvedValueOnce({ fullStream: textGen() } as never);

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "hi" }], tools: [] };
    const events: unknown[] = [];
    for await (const ev of p.stream(req)) {
      events.push(ev);
    }

    expect(streamText).toHaveBeenCalledTimes(3);
    expect(events[0]).toEqual({ type: "text", content: "Recovered" });
    expect(events[1]).toEqual({ type: "done" });
  });

  it("exhausts retries on streamText and yields error", async () => {
    vi.mocked(streamText)
      .mockRejectedValue(Object.assign(new Error("503 Service Unavailable"), { status: 503 }));

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "hi" }], tools: [] };
    const events: unknown[] = [];
    for await (const ev of p.stream(req)) {
      events.push(ev);
    }

    expect(streamText).toHaveBeenCalledTimes(3);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "error", error: expect.stringContaining("503") });
  });

  it("does not retry streamText on non-retryable error", async () => {
    vi.mocked(streamText)
      .mockRejectedValue(Object.assign(new Error("400 Bad Request"), { status: 400 }));

    const p = makeProvider();
    const req: ModelRequest = { messages: [{ role: "user", content: "hi" }], tools: [] };
    const events: unknown[] = [];
    for await (const ev of p.stream(req)) {
      events.push(ev);
    }

    expect(streamText).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "error", error: expect.stringContaining("400") });
  });
});

describe("countTokens()", () => {
  it("returns 0 for empty string", () => {
    const p = makeProvider();
    expect(p.countTokens("")).toBe(0);
  });

  it("returns positive number for non-empty text", () => {
    const p = makeProvider();
    const count = p.countTokens("hello world");
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10);
  });
});
