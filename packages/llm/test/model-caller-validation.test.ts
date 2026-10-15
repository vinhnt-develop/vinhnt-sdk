import { describe, it, expect } from "vitest";
import { ModelCaller } from "../src/model-caller.js";
import { ConfigurationError } from "@vinhnt-sdk/schema";
import type { ModelProvider } from "@vinhnt-sdk/schema";
import type { ModelCallerDeps } from "../src/model-caller.js";

function createValidDeps(model?: ModelProvider): ModelCallerDeps {
  const defaultModel: ModelProvider = model ?? {
    provider: "test",
    model: "gpt-4o" as ModelProvider["model"],
    contextLimit: undefined,
    capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false },
    async generate() { return { content: "ok", provider: "test" }; },
  };
  return {
    defaultModel,
    modelRegistry: undefined,
    maxTokens: 4096,
    thinkingBudget: 0,
    thinkingPrompt: "",
    pluginManager: undefined,
    logger: { info: () => {} },
    emitEvent: async () => {},
    modelForRun: () => undefined,
    setModelForRun: () => {},
    getAvailableTools: () => [],
  };
}

describe("ModelCaller constructor validation", () => {
  it("throws ConfigurationError when defaultModel is missing", () => {
    expect(() => {
      new ModelCaller({
        ...createValidDeps(),
        defaultModel: undefined as any,
      });
    }).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when defaultModel.model is empty string", () => {
    expect(() => {
      new ModelCaller({
        ...createValidDeps(),
        defaultModel: { provider: "test", model: "" as ModelProvider["model"], contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, async generate() { return { content: "ok", provider: "test" }; } } as ModelProvider,
      });
    }).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when defaultModel.model is whitespace only", () => {
    expect(() => {
      new ModelCaller({
        ...createValidDeps(),
        defaultModel: { provider: "test", model: "   " as ModelProvider["model"], contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, async generate() { return { content: "ok", provider: "test" }; } } as ModelProvider,
      });
    }).toThrow(ConfigurationError);
  });

  it("accepts valid defaultModel with non-empty model", () => {
    const caller = new ModelCaller(createValidDeps());
    expect(caller).toBeDefined();
    expect(caller.getDefaultModel().model).toBe("gpt-4o");
  });

  it("getDefaultModel returns the default model", () => {
    const caller = new ModelCaller(createValidDeps());
    const defaultModel = caller.getDefaultModel();
    expect(defaultModel.model).toBe("gpt-4o");
    expect(defaultModel.provider).toBe("test");
  });
});