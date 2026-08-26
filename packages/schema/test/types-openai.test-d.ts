import { describe, it, expectTypeOf } from "vitest";
import type {
  ToolChoice,
  ResponseFormat,
  ResponseFormatJsonSchema,
  StreamOptions,
  Logprobs,
  TokenLogprob,
  TopLogprob,
  ModelRequest,
  ModelResponse,
  ChatMessage,
  ModelUsage,
  ModelStreamEvent,
  OpenAIMessage,
  OpenAIResponse,
  OpenAIChoice,
  OpenAIUsage,
  OpenAIStreamChunk,
  OpenAIStreamChoice,
  OpenAIStreamToolCallDelta,
  OpenAIErrorResponse,
} from "../src/types/index.js";
import {
  KNOWN_FINISH_REASONS,
  KNOWN_REASONING_EFFORTS,
} from "../src/types/index.js";

describe("OpenAI Format Types", () => {
  describe("ToolChoice", () => {
    it("accepts string literals", () => {
      expectTypeOf<"auto">().toMatchTypeOf<ToolChoice>();
      expectTypeOf<"required">().toMatchTypeOf<ToolChoice>();
      expectTypeOf<"none">().toMatchTypeOf<ToolChoice>();
    });

    it("accepts function force object", () => {
      const force: ToolChoice = { type: "function", name: "get_weather" };
      expectTypeOf(force).toMatchTypeOf<ToolChoice>();
    });
  });

  describe("ResponseFormat", () => {
    it("accepts json_object", () => {
      const json: ResponseFormat = { type: "json_object" };
      expectTypeOf(json).toMatchTypeOf<ResponseFormat>();
    });

    it("accepts json_schema", () => {
      const schema: ResponseFormat = {
        type: "json_schema",
        jsonSchema: {
          name: "weather",
          schema: { type: "object" },
          strict: true,
        },
      };
      expectTypeOf(schema).toMatchTypeOf<ResponseFormat>();
    });
  });

  describe("StreamOptions", () => {
    it("accepts includeUsage", () => {
      const opts: StreamOptions = { includeUsage: true };
      expectTypeOf(opts).toMatchTypeOf<StreamOptions>();
    });
  });

  describe("ModelRequest", () => {
    it("accepts all new fields", () => {
      const req: ModelRequest = {
        messages: [],
        tools: [],
        toolChoice: "auto",
        parallelToolCalls: true,
        responseFormat: { type: "json_object" },
        streamOptions: { includeUsage: true },
        presencePenalty: 0.5,
        frequencyPenalty: 0.5,
        logitBias: { "hello": 1 },
        seed: 42,
        user: "user-123",
        logprobs: true,
        topLogprobs: 5,
        maxCompletionTokens: 1024,
        reasoningEffort: "high",
      };
      expectTypeOf(req).toMatchTypeOf<ModelRequest>();
    });
  });

  describe("ModelResponse", () => {
    it("accepts all new fields", () => {
      const res: ModelResponse = {
        content: "Hello",
        finishReason: "stop",
        id: "chatcmpl-123",
        model: "gpt-4",
        created: 1234567890,
        systemFingerprint: "fp_abc",
        logprobs: { content: [] },
        refusal: "I cannot help",
      };
      expectTypeOf(res).toMatchTypeOf<ModelResponse>();
    });

    it("accepts open finishReason string", () => {
      const res: ModelResponse = {
        content: "Hello",
        finishReason: "custom_reason",
      };
      expectTypeOf(res).toMatchTypeOf<ModelResponse>();
    });
  });

  describe("ModelUsage", () => {
    it("accepts all new fields", () => {
      const usage: ModelUsage = {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        cachedTokens: 3,
        reasoningTokens: 2,
        audioTokens: 1,
      };
      expectTypeOf(usage).toMatchTypeOf<ModelUsage>();
    });
  });

  describe("ChatMessage", () => {
    it("accepts refusal", () => {
      const msg: ChatMessage = {
        role: "assistant",
        content: "",
        refusal: "I cannot help",
      };
      expectTypeOf(msg).toMatchTypeOf<ChatMessage>();
    });
  });

  describe("ModelStreamEvent", () => {
    it("accepts logprobs event", () => {
      const event: ModelStreamEvent = {
        type: "logprobs",
        logprobs: { content: [] },
      };
      expectTypeOf(event).toMatchTypeOf<ModelStreamEvent>();
    });
  });

  describe("OpenAI Types", () => {
    it("OpenAIMessage accepts developer role", () => {
      const msg: OpenAIMessage = {
        role: "developer",
        content: "System prompt",
      };
      expectTypeOf(msg).toMatchTypeOf<OpenAIMessage>();
    });

    it("OpenAIChoice accepts string finish_reason", () => {
      const choice: OpenAIChoice = {
        index: 0,
        message: { role: "assistant", content: "Hello" },
        finish_reason: "custom",
      };
      expectTypeOf(choice).toMatchTypeOf<OpenAIChoice>();
    });

    it("OpenAIUsage accepts details", () => {
      const usage: OpenAIUsage = {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        prompt_tokens_details: { cached_tokens: 3 },
        completion_tokens_details: { reasoning_tokens: 2 },
      };
      expectTypeOf(usage).toMatchTypeOf<OpenAIUsage>();
    });

    it("OpenAIStreamChunk is valid", () => {
      const chunk: OpenAIStreamChunk = {
        id: "chatcmpl-123",
        object: "chat.completion.chunk",
        created: 1234567890,
        model: "gpt-4",
        choices: [],
      };
      expectTypeOf(chunk).toMatchTypeOf<OpenAIStreamChunk>();
    });

    it("OpenAIErrorResponse is valid", () => {
      const err: OpenAIErrorResponse = {
        error: {
          message: "Rate limit exceeded",
          type: "rate_limit_error",
          param: null,
          code: "rate_limit_exceeded",
        },
      };
      expectTypeOf(err).toMatchTypeOf<OpenAIErrorResponse>();
    });
  });

  describe("Constants", () => {
    it("KNOWN_FINISH_REASONS is readonly array", () => {
      expectTypeOf(KNOWN_FINISH_REASONS).toMatchTypeOf<readonly string[]>();
    });

    it("KNOWN_REASONING_EFFORTS is readonly array", () => {
      expectTypeOf(KNOWN_REASONING_EFFORTS).toMatchTypeOf<readonly string[]>();
    });
  });
});
