import { describe, expect, it, vi } from "vitest";
import { createImageGenerationTool } from "../src/index.js";
import type { ImageGenerationConfig } from "../src/index.js";
import type { ToolContext } from "@vinhnt-sdk/tools";
import { NetworkError } from "@vinhnt-sdk/schema";

function fakeCtx(signal?: AbortSignal): ToolContext {
  return {
    sessionId: "s1",
    runId: "r1",
    agentId: "a1",
    agentName: "tester",
    signal: signal ?? new AbortController().signal,
    env: {},
    ask: vi.fn().mockResolvedValue("reject"),
    metadata: vi.fn(),
    setCompensation: vi.fn(),
  } as ToolContext;
}

interface Captured {
  url: string;
  init: RequestInit;
}

function jsonResponse(body: unknown, status = 200, statusText = ""): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "content-type": "application/json" },
  });
}

function capturingFetch(handler: (captured: Captured) => Response | Promise<Response>): {
  fetchImpl: typeof fetch;
  captured: Captured[];
} {
  const captured: Captured[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    const one: Captured = { url: String(url), init: init ?? {} };
    captured.push(one);
    return handler(one);
  }) as typeof fetch;
  return { fetchImpl, captured };
}

describe("createImageGenerationTool (G7.3 / P2-8)", () => {
  it("barrel: config type, id/risk/metadata, endpoint join + body/headers", async () => {
    const cfg: ImageGenerationConfig = {
      baseUrl: "https://img.example/v1/",
      apiKey: "sk-test",
      model: "cfg-model",
      size: "512x512",
      defaultParams: { quality: "hd", model: "should-not-win" },
    };
    const { fetchImpl, captured } = capturingFetch(() =>
      jsonResponse({ data: [{ url: "https://cdn.example/1.png", revised_prompt: "better" }] }),
    );
    const tool = createImageGenerationTool({ ...cfg, fetchImpl });

    expect(tool.id).toBe("generate_image");
    expect(tool.risk).toBe("external");
    expect(tool.metadata?.source).toBe("image");

    const result = (await tool.execute(
      { prompt: "a red square" },
      fakeCtx(),
    )) as Record<string, unknown>;
    expect(result).toEqual({ url: "https://cdn.example/1.png", revised_prompt: "better" });

    expect(captured[0]?.url).toBe("https://img.example/v1/images/generations");
    const init = captured[0]!.init;
    const headers = init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["authorization"]).toBe("Bearer sk-test");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({ prompt: "a red square", model: "cfg-model", size: "512x512", quality: "hd" });
  });

  it("per-call model/size override the config defaults", async () => {
    const { fetchImpl, captured } = capturingFetch(() => jsonResponse({ data: [{ url: "u" }] }));
    const tool = createImageGenerationTool({
      baseUrl: "https://img.example/v1",
      model: "cfg-model",
      fetchImpl,
    });
    await tool.execute({ prompt: "p", model: "call-model", size: "1x1" }, fakeCtx());
    const body = JSON.parse(String(captured[0]!.init.body)) as Record<string, unknown>;
    expect(body.model).toBe("call-model");
    expect(body.size).toBe("1x1");
  });

  it("no apiKey → no authorization header", async () => {
    const { fetchImpl, captured } = capturingFetch(() => jsonResponse({ data: [{ url: "u" }] }));
    const tool = createImageGenerationTool({ baseUrl: "https://img.example/v1", fetchImpl });
    await tool.execute({ prompt: "p" }, fakeCtx());
    const headers = captured[0]!.init.headers as Record<string, string>;
    expect(headers["authorization"]).toBeUndefined();
  });

  it("url mode reports b64 size instead of the payload", async () => {
    const { fetchImpl } = capturingFetch(() => jsonResponse({ data: [{ b64_json: "A".repeat(64) }] }));
    const tool = createImageGenerationTool({ baseUrl: "https://img.example/v1", fetchImpl });
    const result = (await tool.execute({ prompt: "p" }, fakeCtx())) as Record<string, unknown>;
    expect(result.b64_json).toBeUndefined();
    expect(result.b64_json_chars).toBe(64);
    expect(String(result.note)).toContain("base64");
  });

  it("imageOutput: base64 returns the full payload", async () => {
    const { fetchImpl } = capturingFetch(() => jsonResponse({ data: [{ b64_json: "QUJD", url: "u" }] }));
    const tool = createImageGenerationTool({
      baseUrl: "https://img.example/v1",
      imageOutput: "base64",
      fetchImpl,
    });
    const result = (await tool.execute({ prompt: "p" }, fakeCtx())) as Record<string, unknown>;
    expect(result.b64_json).toBe("QUJD");
    expect(result.url).toBe("u");
  });

  it("forwards the run abort signal to fetch", async () => {
    const controller = new AbortController();
    const { fetchImpl, captured } = capturingFetch(() => jsonResponse({ data: [{ url: "u" }] }));
    const tool = createImageGenerationTool({ baseUrl: "https://img.example/v1", fetchImpl });
    await tool.execute({ prompt: "p" }, fakeCtx(controller.signal));
    expect(captured[0]!.init.signal).toBe(controller.signal);
  });

  it("HTTP error → NetworkError with status detail", async () => {
    const { fetchImpl } = capturingFetch(() => new Response("quota exceeded", { status: 429, statusText: "Too Many Requests" }));
    const tool = createImageGenerationTool({ baseUrl: "https://img.example/v1", fetchImpl });
    const err = await tool.execute({ prompt: "p" }, fakeCtx()).catch((e: unknown) => e);
    expect(NetworkError.isInstance(err)).toBe(true);
    expect((err as Error).message).toContain("429");
    expect((err as Error).message).toContain("quota exceeded");
  });

  it("network failure / bad JSON / empty data → NetworkError", async () => {
    const failing = createImageGenerationTool({
      baseUrl: "https://img.example/v1",
      fetchImpl: (async () => {
        throw new Error("conn refused");
      }) as typeof fetch,
    });
    const netErr = await failing.execute({ prompt: "p" }, fakeCtx()).catch((e: unknown) => e);
    expect(NetworkError.isInstance(netErr)).toBe(true);
    expect((netErr as Error).message).toContain("conn refused");

    const badJson = createImageGenerationTool({
      baseUrl: "https://img.example/v1",
      fetchImpl: (async () => new Response("<html>", { status: 200 })) as typeof fetch,
    });
    const jsonErr = await badJson.execute({ prompt: "p" }, fakeCtx()).catch((e: unknown) => e);
    expect(NetworkError.isInstance(jsonErr)).toBe(true);

    const empty = createImageGenerationTool({
      baseUrl: "https://img.example/v1",
      fetchImpl: (async () => jsonResponse({ data: [] })) as typeof fetch,
    });
    const emptyErr = await empty.execute({ prompt: "p" }, fakeCtx()).catch((e: unknown) => e);
    expect(NetworkError.isInstance(emptyErr)).toBe(true);
    expect((emptyErr as Error).message).toContain("data[]");
  });

  it("baseUrl is required (no hardcoded endpoint)", () => {
    expect(() => createImageGenerationTool({ baseUrl: "" })).toThrow(TypeError);
    expect(() => createImageGenerationTool({ baseUrl: "   " })).toThrow(/baseUrl/);
  });
});
