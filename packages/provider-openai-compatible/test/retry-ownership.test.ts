import { describe, expect, it, vi } from "vitest";
import type { ModelRequest } from "@vinhnt-sdk/schema";
import { CircuitBreaker } from "@vinhnt-sdk/guard";
import { OpenAICompatibleProvider } from "../src/openai-compatible-provider.js";

function request(): ModelRequest {
  return { messages: [{ role: "user", content: "Hello" }], tools: [] };
}

function jsonBody(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * P0.6 — single retry owner.
 *
 * The composition root (agent provider-factory) builds providers with
 * `retry: { maxRetries: 0 }` so the kernel CircuitBreaker owns retry.
 * Nested layers used to multiply attempts: (providerRetries+1) ×
 * (breakerRetries+1) HTTP calls for a dead model.
 */
describe("P0.6 retry ownership (breaker wraps provider)", () => {
  it("persistent 503 → exactly 3 HTTP calls with breaker(maxRetries 2) + provider retry 0", async () => {
    const fetchMock = vi.fn(async () =>
      jsonBody({ error: { message: "service unavailable" } }, 503),
    );
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://api.example.com/v1",
      apiKey: "k",
      defaultModel: "m",
      fetchImpl: fetchMock as unknown as typeof fetch,
      retry: { maxRetries: 0 },
    });
    const breaker = new CircuitBreaker({ maxRetries: 2, backoffMs: 1, maxBackoffMs: 1 });

    await expect(
      breaker.call(() => provider.generate(request())),
    ).rejects.toMatchObject({ code: "ERR_UPSTREAM_503", retryable: true });

    // 1 provider call per breaker attempt — no multiplication.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("transient 503 heals under the breaker without inner retries", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonBody({ error: { message: "busy" } }, 503))
      .mockResolvedValueOnce(
        jsonBody({
          id: "r",
          object: "chat.completion",
          created: 1,
          model: "m",
          choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
        }),
      );
    const provider = new OpenAICompatibleProvider({
      baseUrl: "https://api.example.com/v1",
      apiKey: "k",
      defaultModel: "m",
      fetchImpl: fetchMock as unknown as typeof fetch,
      retry: { maxRetries: 0 },
    });
    const breaker = new CircuitBreaker({ maxRetries: 3, backoffMs: 1, maxBackoffMs: 1 });

    const res = await breaker.call(() => provider.generate(request()));

    expect(res.content).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
