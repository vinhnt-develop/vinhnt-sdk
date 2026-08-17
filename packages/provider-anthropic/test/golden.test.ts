import { describe, expect, it } from "vitest";
import { createAnthropicProvider, ANTHROPIC_DEFAULT_MODEL, ANTHROPIC_VERSION } from "../src/index.js";

const encoder = new TextEncoder();

function req() {
  return {
    messages: [{ role: "user", content: "Hi" }],
    tools: [{
      id: "t1",
      description: "Search the web",
      risk: "medium",
      type: "function",
      function: { name: "web_search", description: "Search the web" },
    }],
    toolChoice: { type: "function", name: "web_search" },
    maxCompletionTokens: 512,
  } as const;
}

function streamBody(sse: string) {
  return new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(encoder.encode(sse)); c.close(); } }), { status: 200 });
}

describe("Anthropic golden tests", () => {
  it("golden request body + headers", async () => {
    let url = "";
    let headers: Record<string, string> = {};
    let body: Record<string, unknown> | undefined;
    const fetchMock = async (u: string, init: RequestInit) => {
      url = u;
      headers = init.headers as Record<string, string>;
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({
        id: "r", object: "chat.completion", created: 1, model: "claude-sonnet-4-6",
        choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
      }), { status: 200 });
    };

    const p = createAnthropicProvider({ apiKey: "sk-ant-xyz", fetchImpl: fetchMock as typeof fetch });
    await p.generate(req());

    expect(url).toBe("https://api.anthropic.com/v1/chat/completions");
    expect(headers["anthropic-version"]).toBe(ANTHROPIC_VERSION);
    expect(headers["authorization"]).toBe("Bearer sk-ant-xyz");
    expect(body).toEqual({
      model: ANTHROPIC_DEFAULT_MODEL,
      messages: [{ role: "user", content: "Hi" }],
      tools: [{
        type: "function",
        function: { name: "web_search", description: "Search the web" },
      }],
      tool_choice: { type: "function", function: { name: "web_search" } },
      max_completion_tokens: 512,
    });
  });

  it("golden SSE parse", async () => {
    const sse = [
      `data: ${JSON.stringify({ id: "1", object: "chat.completion.chunk", created: 1, model: "claude-sonnet-4-6", choices: [{ index: 0, delta: { content: "Sure" }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "2", object: "chat.completion.chunk", created: 1, model: "claude-sonnet-4-6", choices: [{ index: 0, delta: { content: "." }, finish_reason: "stop" }], usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 } })}`,
      "data: [DONE]",
      "",
    ].join("\n");
    const fetchMock = async () => streamBody(sse);
    const p = createAnthropicProvider({ apiKey: "sk-ant-xyz", fetchImpl: fetchMock as typeof fetch });

    const events = [];
    for await (const e of p.stream(req())) events.push(e);
    expect(events).toEqual([
      { type: "text", content: "Sure" },
      { type: "text", content: "." },
      { type: "finish", reason: "stop" },
      { type: "usage", inputTokens: 2, outputTokens: 1 },
      { type: "done" },
    ]);
  });
});