import { describe, expect, it } from "vitest";
import { createOllamaProvider, OLLAMA_DEFAULT_MODEL } from "../src/index.js";

const encoder = new TextEncoder();

function req() {
  return {
    messages: [{ role: "user", content: "Hi" }],
    tools: [{
      id: "t1",
      description: "List files",
      risk: "high",
      type: "function",
      function: { name: "list_files", description: "List files in a dir" },
    }],
    maxCompletionTokens: 128,
  } as const;
}

function streamBody(sse: string) {
  return new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(encoder.encode(sse)); c.close(); } }), { status: 200 });
}

describe("Ollama golden tests", () => {
  it("golden request body — no auth", async () => {
    let url = "";
    let headers: Record<string, string> = {};
    let body: Record<string, unknown> | undefined;
    const fetchMock = async (u: string, init: RequestInit) => {
      url = u;
      headers = init.headers as Record<string, string>;
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({
        id: "r", object: "chat.completion", created: 1, model: "llama3.2",
        choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
      }), { status: 200 });
    };

    const p = createOllamaProvider({ fetchImpl: fetchMock as typeof fetch });
    await p.generate(req());

    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(headers["authorization"]).toBeUndefined();
    expect(body).toEqual({
      model: OLLAMA_DEFAULT_MODEL,
      messages: [{ role: "user", content: "Hi" }],
      tools: [{
        type: "function",
        function: { name: "list_files", description: "List files in a dir" },
      }],
      max_completion_tokens: 128,
    });
  });

  it("golden SSE parse", async () => {
    const sse = [
      `data: ${JSON.stringify({ id: "1", object: "chat.completion.chunk", created: 1, model: "llama3.2", choices: [{ index: 0, delta: { content: "Hi " }, finish_reason: null }] })}`,
      `data: ${JSON.stringify({ id: "2", object: "chat.completion.chunk", created: 1, model: "llama3.2", choices: [{ index: 0, delta: { content: "there" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } })}`,
      "data: [DONE]",
      "",
    ].join("\n");
    const fetchMock = async () => streamBody(sse);
    const p = createOllamaProvider({ fetchImpl: fetchMock as typeof fetch });

    const events = [];
    for await (const e of p.stream(req())) events.push(e);
    expect(events).toEqual([
      { type: "text", content: "Hi " },
      { type: "text", content: "there" },
      { type: "finish", reason: "stop" },
      { type: "usage", inputTokens: 1, outputTokens: 2 },
      { type: "done" },
    ]);
  });
});