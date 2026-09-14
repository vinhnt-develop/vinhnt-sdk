import { describe, it, expect } from "vitest";
import { ModelCaller } from "../src/model-caller.js";
import { ConfigurationError } from "@vinhnt-sdk/schema";
import type { ModelProvider, ModelCallerDeps } from "@vinhnt-sdk/schema";

function createValidDeps(model?: ModelProvider): ModelCallerDeps {
  return {
    defaultModel: model ?? { provider: "test", model: "gpt-4o", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined },
    modelRegistry: undefined,
    maxTokens: 4096,
    thinkingBudget: undefined,
    thinkingPrompt: undefined,
    pluginManager: undefined,
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    emitEvent: () => {},
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
        defaultModel: { provider: "test", model: "", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined },
      });
    }).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when defaultModel.model is whitespace only", () => {
    expect(() => {
      new ModelCaller({
        ...createValidDeps(),
        defaultModel: { provider: "test", model: "   ", contextLimit: undefined, capabilities: { streaming: true, toolCalling: true, imageInput: false, thinking: false, structuredOutput: false }, pricing: undefined },
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