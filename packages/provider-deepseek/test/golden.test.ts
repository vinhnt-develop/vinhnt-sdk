import { describe, expect, it } from "vitest";
import { createDeepSeekProvider, DEEPSEEK_CHAT_MODEL } from "../src/index.js";

const encoder = new TextEncoder();

function req() {
  return {
    system: "Be brief.",
    messages: [{ role: "user", content: "Hi" }],
    tools: [{
      id: "t1",
      description: "Get stock price",
      risk: "low",
      type: "function",
      function: { name: "get_stock", description: "Get stock price", parameters: { type: "object" } },
    }],
    toolChoice: "auto",
    maxCompletionTokens: 256,
    streamOptions: { includeUsage: true },
  } as const;
}

function streamBody(sse: string) {
  return new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(encoder.encode(sse)); c.close(); } }), { status: 200 });
}

describe("DeepSeek golden tests", () => {
  it("golden request body", async () => {
    let url = "";
    let body: Record<string, unknown> | undefined;
    const fetchMock = async (u: string, init: RequestInit) => {
      url = u;
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({
        id: "r", object: "chat.completion", created: 1, model: "deepseek-chat",
        choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
      }), { status: 200 });
    };

    const p = createDeepSeekProvider({ apiKey: "sk-abc", fetchImpl: fetchMock as typeof fetch });
    await p.generate(req());

    expect(url).toBe("https://api.deepseek.com/v1/chat/completions");
    expect(body).toEqual({
      model: DEEPSEEK_CHAT_MODEL,
      messages: [
        { role: "system", content: "Be brief." },
        { role: "user", content: "Hi" },
      ],
      tools: [{
        type: "function",
        function: { name: "get_stock", description: "Get stock price", parameters: { type: "object" } },
      }],
      tool_choice: "auto",
      max_completion_tokens: 256,
    });
  });

  it("golden SSE parse", async () => {
    const sse = [
      `data: ${JSON.stringify({ id: "1", object: "chat.completion.chunk", created: 1, model: "deepseek-chat", choices: [{ index: 0, delta: { content: "Hello" }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "2", object: "chat.completion.chunk", created: 1, model: "deepseek-chat", choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 } })}`,
      "data: [DONE]",
      "",
    ].join("\n");
    const fetchMock = async () => streamBody(sse);
    const p = createDeepSeekProvider({ apiKey: "sk-abc", fetchImpl: fetchMock as typeof fetch });

    const events = [];
    for await (const e of p.stream(req())) events.push(e);
    expect(events).toEqual([
      { type: "text", content: "Hello" },
      { type: "finish", reason: "stop" },
      { type: "usage", inputTokens: 2, outputTokens: 1 },
      { type: "done" },
    ]);
  });
});