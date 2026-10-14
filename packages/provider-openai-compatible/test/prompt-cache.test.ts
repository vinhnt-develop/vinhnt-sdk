import { describe, expect, it } from "vitest";
import type { ModelRequest, OpenAIMessage } from "@vinhnt-sdk/schema";
import {
  buildRequest,
  applyPromptCacheShaping,
  CACHE_CONTROL_EPHEMERAL,
  OpenAICompatibleProvider,
} from "../src/index.js";
import type { PromptCacheShaping } from "../src/index.js";

const EPHEMERAL = { type: "ephemeral" } as const;

function request(overrides: Partial<ModelRequest> = {}): ModelRequest {
  return {
    system: "You are helpful",
    messages: [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
      { role: "user", content: "next" },
    ],
    tools: [
      { id: "t1", description: "d1", inputSchema: { type: "object" }, risk: "read" },
      { id: "t2", description: "d2", inputSchema: { type: "object" }, risk: "read" },
    ],
    ...overrides,
  };
}

const asArray = (v: unknown): readonly OpenAIMessage[] => v as readonly OpenAIMessage[];

describe("prompt-cache request shaping (P2-9 / G7.1)", () => {
  it("default (no promptCache) leaves the body completely unshaped", () => {
    const body = buildRequest(request(), { model: "m" });
    expect(JSON.stringify(body)).not.toContain("cache_control");
    expect(JSON.stringify(body)).not.toContain("prompt_cache_key");
  });

  it("cache_control defaults: system + last tool + message before-last, ≤4 breakpoints", () => {
    const body = buildRequest(request(), { model: "m", promptCache: { mode: "cache_control" } });
    const messages = asArray(body.messages);
    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.cache_control).toEqual(EPHEMERAL);
    // before-last of 4 messages = index 2 (stable prefix ends before newest turn)
    expect(messages[2]?.cache_control).toEqual(EPHEMERAL);
    expect(messages[3]?.cache_control).toBeUndefined();
    expect(messages[1]?.cache_control).toBeUndefined();
    const tools = body.tools!;
    expect(tools[tools.length - 1]?.cache_control).toEqual(EPHEMERAL);
    expect(tools[0]?.cache_control).toBeUndefined();
    const count = JSON.stringify(body).split("ephemeral").length - 1;
    expect(count).toBeLessThanOrEqual(4);
  });

  it("messages:'last' annotates the newest turn instead", () => {
    const body = buildRequest(request(), {
      model: "m",
      promptCache: { mode: "cache_control", options: { messages: "last", system: false, tools: false } },
    });
    const messages = asArray(body.messages);
    expect(messages[messages.length - 1]?.cache_control).toEqual(EPHEMERAL);
    expect(messages[0]?.cache_control).toBeUndefined();
    expect(JSON.stringify(body.tools)).not.toContain("ephemeral");
  });

  it("messages:false and disabled toggles drop the corresponding breakpoints", () => {
    const body = buildRequest(request(), {
      model: "m",
      promptCache: { mode: "cache_control", options: { messages: false, system: false, tools: false } },
    });
    expect(JSON.stringify(body)).not.toContain("ephemeral");
  });

  it("single-message conversation gets no before-last message breakpoint", () => {
    const shaped = applyPromptCacheShaping(
      [{ role: "user", content: "only" }],
      undefined,
      { mode: "cache_control", options: { system: false, tools: false } },
    );
    expect(shaped.breakpoints).toBe(0);
    expect(shaped.messages[0]?.cache_control).toBeUndefined();
  });

  it("no system message → no system breakpoint; empty tools → no tool breakpoint", () => {
    const shaped = applyPromptCacheShaping(
      [{ role: "user", content: "a" }, { role: "user", content: "b" }],
      [],
      { mode: "cache_control" },
    );
    expect(shaped.breakpoints).toBe(1); // only the message breakpoint
    expect(shaped.tools).toEqual([]);
  });

  it("applyPromptCacheShaping off/undefined passes through with breakpoints:0 and no mutation", () => {
    const messages: OpenAIMessage[] = [{ role: "user", content: "x" }];
    const tools: readonly { readonly cache_control?: { readonly type: "ephemeral" } }[] = [{}];
    const pass = applyPromptCacheShaping(messages, tools, { mode: "off" });
    expect(pass.messages).toBe(messages);
    expect(pass.tools).toBe(tools);
    expect(pass.breakpoints).toBe(0);
    expect(applyPromptCacheShaping(messages, tools, undefined).breakpoints).toBe(0);
    // a real placement returns a new array but never mutates the input
    const two: OpenAIMessage[] = [{ role: "user", content: "a" }, { role: "user", content: "b" }];
    const shaped = applyPromptCacheShaping(two, tools, {
      mode: "cache_control",
      options: { system: false, tools: false },
    });
    expect(two[0]?.cache_control).toBeUndefined();
    expect(two[1]?.cache_control).toBeUndefined();
    expect(tools[0]).not.toHaveProperty("cache_control");
    expect(shaped.messages).not.toBe(two);
    expect(shaped.messages[0]?.cache_control).toEqual(EPHEMERAL);
  });

  it("prompt_cache_key mode sets body key/retention and annotates nothing", () => {
    const shaping: PromptCacheShaping = { mode: "prompt_cache_key", key: "sess-42", retention: "24h" };
    const body = buildRequest(request(), { model: "m", promptCache: shaping });
    expect(body.prompt_cache_key).toBe("sess-42");
    expect(body.prompt_cache_retention).toBe("24h");
    expect(JSON.stringify(body)).not.toContain("ephemeral");
  });

  it("provider-level promptCache flows into the wire body (fetchImpl capture)", async () => {
    let captured: unknown;
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://api.example.com/v1",
      defaultModel: "m",
      promptCache: { mode: "cache_control" },
      fetchImpl: (async (_url: string, init: RequestInit) => {
        captured = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({ choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }) as typeof fetch,
    });
    await provider.generate({
      system: "You are helpful",
      tools: [],
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "yo" },
        { role: "user", content: "next" },
      ],
    });
    const body = JSON.stringify(captured);
    expect(body).toContain("ephemeral");
  });

  it("provider without promptCache sends an unshaped body", async () => {
    let captured: unknown;
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://api.example.com/v1",
      defaultModel: "m",
      fetchImpl: (async (_url: string, init: RequestInit) => {
        captured = JSON.parse(String(init.body));
        return new Response(
          JSON.stringify({ choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }) as typeof fetch,
    });
    await provider.generate({ messages: [{ role: "user", content: "hi" }], tools: [] });
    expect(JSON.stringify(captured)).not.toContain("ephemeral");
    expect(CACHE_CONTROL_EPHEMERAL).toEqual(EPHEMERAL);
  });
});
