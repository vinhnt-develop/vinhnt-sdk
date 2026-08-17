import { describe, expect, it } from "vitest";
import {
  createOllamaProvider,
  OLLAMA_BASE_URL,
  OLLAMA_DEFAULT_MODEL,
  OLLAMA_CONTEXT_LIMIT,
} from "../src/index.js";

describe("createOllamaProvider", () => {
  it("wires the local Ollama base URL, default model and provider name", () => {
    const p = createOllamaProvider({ fetchImpl: (() => {}) as unknown as typeof fetch });

    expect(p.provider).toBe("ollama");
    expect(p.model).toBe(OLLAMA_DEFAULT_MODEL);
    expect(p.contextLimit).toBe(OLLAMA_CONTEXT_LIMIT);
    expect(p.capabilities).toEqual({
      streaming: true,
      toolCalling: true,
      imageInput: true,
      thinking: true,
      structuredOutput: true,
    });
    expect(OLLAMA_BASE_URL).toBe("http://localhost:11434/v1");
  });

  it("generates without an API key against the base provider", async () => {
    let seenAuth: string | undefined;
    const fetchMock = async (_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      seenAuth = headers["authorization"];
      return new Response(JSON.stringify({
        id: "r", object: "chat.completion", created: 1, model: "llama3.2",
        choices: [{ index: 0, message: { role: "assistant", content: "hello" }, finish_reason: "stop" }],
      }), { status: 200 });
    };

    const p = createOllamaProvider({ fetchImpl: fetchMock as typeof fetch });
    const res = await p.generate({ messages: [{ role: "user", content: "Hi" }], tools: [] });
    expect(res.content).toBe("hello");
    expect(seenAuth).toBeUndefined();
  });

  it("honours explicit overrides", () => {
    const p = createOllamaProvider({
      baseUrl: "http://10.0.0.5:11434/v1",
      model: "qwen3:8b",
      capabilities: { imageInput: false },
      fetchImpl: (() => {}) as unknown as typeof fetch,
    });

    expect(p.model).toBe("qwen3:8b");
    expect(p.capabilities.imageInput).toBe(false);
    expect(p.capabilities.toolCalling).toBe(true);
  });
});