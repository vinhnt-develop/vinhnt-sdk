import { describe, expect, it, vi } from "vitest";
import { ModelCaller } from "../src/model-caller.js";
import type { ModelRequest, ModelResponse, ModelProvider } from "../src/model-caller.js";
import type { RunId, RequestContext, RequestId, TraceId } from "@vinhnt-sdk/schema";

const runId = "run_tc" as RunId;
const ctx: RequestContext = {
  requestId: "req_tc" as RequestId,
  traceId: "trace_tc" as TraceId,
  actorId: "test",
  tenantId: "default",
};

class CaptureProvider implements ModelProvider {
  readonly provider = "capture";
  readonly model = "capture-model" as ModelProvider["model"];
  readonly pricing = { input: 1, output: 1 };
  readonly capabilities = {
    streaming: true,
    toolCalling: true,
    imageInput: false,
    thinking: false,
    structuredOutput: false,
  } as const;
  lastRequest: ModelRequest | undefined;

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    this.lastRequest = request;
    return { content: "ok", provider: "capture" };
  }
}

function makeCaller(provider: ModelProvider, tools: unknown[] = [], toolChoice?: ModelRequest["toolChoice"]) {
  return new ModelCaller({
    defaultModel: provider,
    modelRegistry: undefined,
    maxTokens: 1024,
    thinkingBudget: 0,
    thinkingPrompt: "",
    pluginManager: undefined,
    logger: undefined,
    emitEvent: async () => {},
    modelForRun: () => provider,
    setModelForRun: () => {},
    getAvailableTools: () => tools as never,
    ...(toolChoice !== undefined ? { toolChoice } : {}),
  });
}

describe("P0'-3 callModelStream toolChoice override", () => {
  const tools = [{ name: "write_file", description: "w", parameters: { type: "object" as const } }];

  it("uses default toolChoice when no override", async () => {
    const provider = new CaptureProvider();
    const caller = makeCaller(provider, tools, "auto");
    await caller.callModelStream([], 0, runId, ctx, new AbortController().signal);
    expect(provider.lastRequest?.toolChoice).toBe("auto");
  });

  it("override required wins over default", async () => {
    const provider = new CaptureProvider();
    const caller = makeCaller(provider, tools, "auto");
    await caller.callModelStream([], 0, runId, ctx, new AbortController().signal, undefined, false, "required");
    expect(provider.lastRequest?.toolChoice).toBe("required");
    expect(provider.lastRequest?.tools?.length).toBeGreaterThan(0);
  });

  it("disableTools sets tool_choice=none and drops tools", async () => {
    const provider = new CaptureProvider();
    const caller = makeCaller(provider, tools, "auto");
    await caller.callModelStream([], 0, runId, ctx, new AbortController().signal, undefined, true);
    expect(provider.lastRequest?.toolChoice).toBe("none");
    expect(provider.lastRequest?.tools).toEqual([]);
  });

  it("override still applies when disableTools is false and tools present", async () => {
    const provider = new CaptureProvider();
    const caller = makeCaller(provider, tools, "none");
    await caller.callModelStream([], 0, runId, ctx, new AbortController().signal, undefined, false, "required");
    expect(provider.lastRequest?.toolChoice).toBe("required");
  });
});
