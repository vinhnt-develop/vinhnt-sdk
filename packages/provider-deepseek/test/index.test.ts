import { describe, expect, it } from "vitest";
import {
  createDeepSeekProvider,
  DEEPSEEK_BASE_URL,
  DEEPSEEK_CHAT_MODEL,
  DEEPSEEK_CONTEXT_LIMIT,
} from "../src/index.js";

describe("createDeepSeekProvider", () => {
  it("wires the DeepSeek base URL, default model and provider name", () => {
    const p = createDeepSeekProvider({
      apiKey: "sk-test",
      fetchImpl: (() => {}) as unknown as typeof fetch,
    });

    expect(p.provider).toBe("deepseek");
    expect(p.model).toBe(DEEPSEEK_CHAT_MODEL);
    expect(p.contextLimit).toBe(DEEPSEEK_CONTEXT_LIMIT);
    expect(p.capabilities).toEqual({
      streaming: true,
      toolCalling: true,
      imageInput: false,
      thinking: true,
      structuredOutput: true,
    });
    expect(DEEPSEEK_BASE_URL).toBe("https://api.deepseek.com/v1");
  });

  it("honours explicit overrides", () => {
    const p = createDeepSeekProvider({
      apiKey: "sk-test",
      baseUrl: "https://proxy.example.com/v1",
      model: "deepseek-reasoner",
      contextLimit: 128000,
      capabilities: { thinking: false },
      fetchImpl: (() => {}) as unknown as typeof fetch,
    });

    expect(p.model).toBe("deepseek-reasoner");
    expect(p.contextLimit).toBe(128000);
    expect(p.capabilities.thinking).toBe(false);
    expect(p.capabilities.toolCalling).toBe(true);
  });

  it("generates against a live request to the base provider", async () => {
    const fetchMock = async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.model).toBe("deepseek-chat");
      return new Response(JSON.stringify({
        id: "r", object: "chat.completion", created: 1, model: "deepseek-chat",
        choices: [{ index: 0, message: { role: "assistant", content: "hi" }, finish_reason: "stop" }],
      }), { status: 200 });
    };

    const p = createDeepSeekProvider({ apiKey: "sk-test", fetchImpl: fetchMock as typeof fetch });
    const res = await p.generate({ messages: [{ role: "user", content: "Hello" }], tools: [] });
    expect(res.content).toBe("hi");
  });
});