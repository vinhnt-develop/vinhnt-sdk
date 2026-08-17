import { describe, expect, it } from "vitest";
import type { ModelRequest } from "@vinhnt-sdk/schema";
import { buildRequest } from "../src/build-request.js";

function baseRequest(overrides: Partial<ModelRequest> = {}): ModelRequest {
  return {
    messages: [{ role: "user", content: "Hello" }],
    tools: [],
    ...overrides,
  };
}

describe("buildRequest", () => {
  it("maps messages to OpenAI format", () => {
    const body = buildRequest(baseRequest(), { model: "gpt-4o" });
    expect(body.model).toBe("gpt-4o");
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
  });

  it("prepends top-level system prompt as a system message", () => {
    const body = buildRequest(
      baseRequest({ system: "You are helpful" }),
      { model: "m" },
    );
    expect(body.messages).toEqual([
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" },
    ]);
  });

  it("converts vinhnt tool calls to OpenAI tool_calls", () => {
    const body = buildRequest(baseRequest({
      messages: [{
        role: "assistant",
        content: "",
        toolCalls: [{ id: "c1", name: "read_file", args: { path: "a" } }],
      }],
    }), { model: "m" });
    expect((body.messages[0] as { tool_calls?: unknown }).tool_calls).toEqual([{
      id: "c1",
      type: "function",
      function: { name: "read_file", arguments: '{"path":"a"}' },
    }]);
  });

  it("maps tools via passthrough function shape when present", () => {
    const body = buildRequest(baseRequest({
      tools: [{
        id: "t1",
        description: "desc",
        risk: "low",
        type: "function",
        function: { name: "lookup", description: "desc", parameters: { type: "object" }, strict: true },
      }],
    }), { model: "m" });
    expect(body.tools).toEqual([{
      type: "function",
      function: { name: "lookup", description: "desc", parameters: { type: "object" }, strict: true },
    }]);
  });

  it("omits parameters when the tool has none", () => {
    const body = buildRequest(baseRequest({
      tools: [{
        id: "t1",
        description: "desc",
        risk: "low",
        type: "function",
        function: { name: "lookup", description: "desc" },
      }],
    }), { model: "m" });
    expect(body.tools).toEqual([{
      type: "function",
      function: { name: "lookup", description: "desc" },
    }]);
    expect(JSON.stringify(body.tools)).not.toContain("parameters");
  });

  it("builds tools from id/inputSchema when no function passthrough", () => {
    const body = buildRequest(baseRequest({
      tools: [{
        id: "t2",
        name: "search",
        description: "search things",
        risk: "low",
        inputSchema: { type: "object", properties: { q: { type: "string" } } },
      }],
    }), { model: "m" });
    expect(body.tools).toEqual([{
      type: "function",
      function: {
        name: "search",
        description: "search things",
        parameters: { type: "object", properties: { q: { type: "string" } } },
      },
    }]);
  });

  it("maps tool_choice strings and forced function", () => {
    expect(buildRequest(baseRequest({ toolChoice: "auto" }), { model: "m" }).tool_choice).toBe("auto");
    expect(buildRequest(baseRequest({ toolChoice: "none" }), { model: "m" }).tool_choice).toBe("none");
    expect(buildRequest(baseRequest({ toolChoice: { type: "function", name: "lookup" } }), { model: "m" }).tool_choice)
      .toEqual({ type: "function", function: { name: "lookup" } });
  });

  it("prefers max_completion_tokens over max_tokens", () => {
    const body = buildRequest(baseRequest({ maxCompletionTokens: 2048, maxTokens: 1024 }), { model: "m" });
    expect(body.max_completion_tokens).toBe(2048);
    expect(body.max_tokens).toBeUndefined();
  });

  it("falls back to max_tokens", () => {
    const body = buildRequest(baseRequest({ maxTokens: 1024 }), { model: "m" });
    expect(body.max_tokens).toBe(1024);
  });

  it("sets stream + stream_options.include_usage", () => {
    const body = buildRequest(baseRequest(), { model: "m", stream: true, includeUsage: true });
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
  });

  it("omits stream_options when includeUsage is false", () => {
    const body = buildRequest(baseRequest(), { model: "m", stream: true });
    expect(body.stream).toBe(true);
    expect(body.stream_options).toBeUndefined();
  });

  it("maps json_object response_format", () => {
    const body = buildRequest(baseRequest({ responseFormat: { type: "json_object" } }), { model: "m" });
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("maps json_schema response_format with strict", () => {
    const body = buildRequest(baseRequest({
      responseFormat: { type: "json_schema", jsonSchema: { name: "answer", schema: { type: "object" }, strict: true } },
    }), { model: "m" });
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "answer", schema: { type: "object" }, strict: true },
    });
  });

  it("maps sampling/penalty/user/logprobs fields", () => {
    const body = buildRequest(baseRequest({
      temperature: 0.3,
      topP: 0.9,
      stopSequences: ["stop"],
      presencePenalty: 0.1,
      frequencyPenalty: 0.2,
      seed: 42,
      user: "u-1",
      logprobs: true,
      topLogprobs: 3,
      reasoningEffort: "high",
    }), { model: "m" });
    expect(body.temperature).toBe(0.3);
    expect(body.top_p).toBe(0.9);
    expect(body.stop).toBe("stop");
    expect(body.presence_penalty).toBe(0.1);
    expect(body.frequency_penalty).toBe(0.2);
    expect(body.seed).toBe(42);
    expect(body.user).toBe("u-1");
    expect(body.logprobs).toBe(true);
    expect(body.top_logprobs).toBe(3);
    expect(body.reasoning_effort).toBe("high");
  });

  it("maps multi-stop sequences to an array", () => {
    const body = buildRequest(baseRequest({ stopSequences: ["a", "b"] }), { model: "m" });
    expect(body.stop).toEqual(["a", "b"]);
  });
});