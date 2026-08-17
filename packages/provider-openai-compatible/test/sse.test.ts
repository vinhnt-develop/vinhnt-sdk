import { describe, expect, it } from "vitest";
import type { OpenAIStreamChunk, ModelStreamEvent } from "@vinhnt-sdk/schema";
import { createSSEStream, toModelStreamEvents } from "../src/sse.js";

const encoder = new TextEncoder();

function toStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function textChunk(id: string, content: string, finishReason: string | null = null): unknown {
  return {
    id,
    object: "chat.completion.chunk",
    created: 1,
    model: "gpt-4o",
    choices: [{ index: 0, delta: { content }, finish_reason: finishReason }],
  };
}

function usageChunk(id: string): unknown {
  return {
    id,
    object: "chat.completion.chunk",
    created: 1,
    model: "gpt-4o",
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  };
}

function toolDeltaChunk(id: string, deltas: Array<{ index: number; id?: string; name?: string; arguments?: string }>): unknown {
  return {
    id,
    object: "chat.completion.chunk",
    created: 1,
    model: "gpt-4o",
    choices: [{
      index: 0,
      delta: {
        tool_calls: deltas.map((d) => ({
          index: d.index,
          ...(d.id !== undefined ? { id: d.id } : {}),
          ...(d.name !== undefined || d.arguments !== undefined ? { function: { ...(d.name !== undefined ? { name: d.name } : {}), ...(d.arguments !== undefined ? { arguments: d.arguments } : {}) } } : {}),
        })),
      },
      finish_reason: null,
    }],
  };
}

describe("createSSEStream", () => {
  it("parses individual data: lines delimited by blank lines", async () => {
    const input = `data: ${JSON.stringify(textChunk("a", "Hel"))}\n\ndata: ${JSON.stringify(textChunk("b", "lo"))}\n\ndata: [DONE]\n\n`;
    const events: unknown[] = [];
    for await (const evt of createSSEStream(toStream(input))) events.push(evt);
    expect(events).toHaveLength(2);
    expect((events[0] as { id: string }).id).toBe("a");
    expect((events[1] as { id: string }).id).toBe("b");
  });

  it("parses providers that omit blank-line delimiters", async () => {
    const input = `data: ${JSON.stringify(textChunk("a", "Hel"))}\ndata: ${JSON.stringify(textChunk("b", "lo"))}\ndata: [DONE]\n`;
    const events: unknown[] = [];
    for await (const evt of createSSEStream(toStream(input))) events.push(evt);
    expect(events).toHaveLength(2);
  });

  it("handles CRLF line endings", async () => {
    const input = `data: ${JSON.stringify(textChunk("a", "Hi"))}\r\ndata: [DONE]\r\n`;
    const events: unknown[] = [];
    for await (const evt of createSSEStream(toStream(input))) events.push(evt);
    expect(events).toHaveLength(1);
  });

  it("assembles multi-line JSON events", async () => {
    const json = JSON.stringify(textChunk("m", "world"));
    const splitAt = json.indexOf(",") + 1;
    const input = `data: ${json.slice(0, splitAt)}\ndata: ${json.slice(splitAt)}\n\n`;
    const events: OpenAIStreamChunk[] = [];
    for await (const evt of createSSEStream(toStream(input))) events.push(evt as OpenAIStreamChunk);
    expect(events).toHaveLength(1);
    expect((events[0] as { id: string }).id).toBe("m");
  });

  it("stops at [DONE] and surfaces the final usage chunk", async () => {
    const input = `data: ${JSON.stringify(textChunk("a", "x"))}\n\ndata: ${JSON.stringify(usageChunk("u"))}\n\ndata: [DONE]\n\n`;
    const events: unknown[] = [];
    for await (const evt of createSSEStream(toStream(input))) events.push(evt);
    expect(events).toHaveLength(2);
    const last = events[1] as { usage?: { prompt_tokens: number } };
    expect(last.usage?.prompt_tokens).toBe(10);
  });

  it("parses when a line is split across multiple byte chunks", async () => {
    const json = JSON.stringify(textChunk("a", "split"));
    const full = `data: ${json}\n\n`;
    // Stream the payload one byte at a time.
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of encoder.encode(full)) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    const events: unknown[] = [];
    for await (const evt of createSSEStream(stream)) events.push(evt);
    expect(events).toHaveLength(1);
  });
});

describe("toModelStreamEvents", () => {
  it("yields text events in order and finishes with done", async () => {
    const input = `data: ${JSON.stringify(textChunk("a", "Hel"))}\n\ndata: ${JSON.stringify(textChunk("b", "lo"))}\n\ndata: [DONE]\n\n`;
    const events: ModelStreamEvent[] = [];
    for await (const evt of toModelStreamEvents(toStream(input))) events.push(evt);

    expect(events).toEqual([
      { type: "text", content: "Hel" },
      { type: "text", content: "lo" },
      { type: "done" },
    ]);
  });

  it("assembles fragmented tool call argument deltas into one tool_call", async () => {
    const input = [
      `data: ${JSON.stringify(toolDeltaChunk("c1", [{ index: 0, id: "tc1", name: "read_file" }]))}`,
      `data: ${JSON.stringify(toolDeltaChunk("c2", [{ index: 0, arguments: '{"path":' }]))}`,
      `data: ${JSON.stringify(toolDeltaChunk("c3", [{ index: 0, arguments: '"a.txt"}' }]))}`,
      "data: [DONE]",
      "",
    ].join("\n");

    const events: ModelStreamEvent[] = [];
    for await (const evt of toModelStreamEvents(toStream(input))) events.push(evt);

    const toolCall = events.find((e) => e.type === "tool_call");
    expect(toolCall).toEqual({ type: "tool_call", id: "tc1", name: "read_file", args: { path: "a.txt" } });
    expect(events[events.length - 1]).toEqual({ type: "done" });
  });

  it("yields usage from the final chunk", async () => {
    const input = `data: ${JSON.stringify(usageChunk("u"))}\n\ndata: [DONE]\n\n`;
    const events: ModelStreamEvent[] = [];
    for await (const evt of toModelStreamEvents(toStream(input))) events.push(evt);
    const usage = events.find((e) => e.type === "usage");
    expect(usage).toEqual({ type: "usage", inputTokens: 10, outputTokens: 5 });
  });

  it("yields finish reason", async () => {
    const input = `data: ${JSON.stringify(textChunk("a", "done", "stop"))}\n\ndata: [DONE]\n\n`;
    const events: ModelStreamEvent[] = [];
    for await (const evt of toModelStreamEvents(toStream(input))) events.push(evt);
    expect(events).toContainEqual({ type: "finish", reason: "stop" });
  });
});