import { describe, expect, it } from "vitest";
import {
  createAnthropicProvider,
  ANTHROPIC_BASE_URL,
  ANTHROPIC_VERSION,
  ANTHROPIC_DEFAULT_MODEL,
  ANTHROPIC_CONTEXT_LIMIT,
} from "../src/index.js";

describe("createAnthropicProvider", () => {
  it("wires the Claude OpenAI-compatible endpoint, version header and provider name", () => {
    const p = createAnthropicProvider({
      apiKey: "sk-ant-test",
      fetchImpl: (() => {}) as unknown as typeof fetch,
    });

    expect(p.provider).toBe("anthropic");
    expect(p.model).toBe(ANTHROPIC_DEFAULT_MODEL);
    expect(p.contextLimit).toBe(ANTHROPIC_CONTEXT_LIMIT);
    expect(p.capabilities).toEqual({
      streaming: true,
      toolCalling: true,
      imageInput: true,
      thinking: false,
      structuredOutput: false,
    });
    expect(ANTHROPIC_BASE_URL).toBe("https://api.anthropic.com/v1");
    expect(ANTHROPIC_VERSION).toBe("2023-06-01");
  });

  it("sends the anthropic-version header on requests", async () => {
    let sentHeaders: Record<string, string> | undefined;
    const fetchMock = async (_url: string, init: RequestInit) => {
      sentHeaders = init.headers as Record<string, string>;
      return new Response(JSON.stringify({
        id: "r", object: "chat.completion", created: 1, model: "claude-sonnet-4-6",
        choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
      }), { status: 200 });
    };

    const p = createAnthropicProvider({ apiKey: "sk-ant-test", fetchImpl: fetchMock as typeof fetch });
    await p.generate({ messages: [{ role: "user", content: "Hi" }], tools: [] });

    expect(sentHeaders?.["anthropic-version"]).toBe("2023-06-01");
    expect(sentHeaders?.["authorization"]).toBe("Bearer sk-ant-test");
  });

  it("honours explicit overrides", () => {
    const p = createAnthropicProvider({
      apiKey: "sk-ant-test",
      baseUrl: "https://proxy.example.com/v1",
      model: "claude-haiku-4-5",
      capabilities: { imageInput: false },
      fetchImpl: (() => {}) as unknown as typeof fetch,
    });

    expect(p.model).toBe("claude-haiku-4-5");
    expect(p.capabilities.imageInput).toBe(false);
  });
});