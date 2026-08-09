import { describe, expect, it } from "vitest";
import {
  fromOpenAIMessage,
  toOpenAIMessage,
  fromOpenAIResponse,
  toOpenAIResponse,
  fromOpenAIStreamChunk,
  fromOpenAIError,
  fromAnthropicMessage,
} from "../src/types/adapter.js";
import type {
  OpenAIMessage,
  OpenAIResponse,
  OpenAIStreamChunk,
} from "../src/types/adapter.js";

describe("OpenAI Adapter", () => {
  describe("fromOpenAIMessage", () => {
    it("converts simple string content", () => {
      const msg: OpenAIMessage = { role: "user", content: "Hello" };
      const result = fromOpenAIMessage(msg);
      expect(result).toEqual({ role: "user", content: "Hello" });
    });

    it("converts null content to empty string", () => {
      const msg: OpenAIMessage = { role: "assistant", content: null };
      const result = fromOpenAIMessage(msg);
      expect(result).toEqual({ role: "assistant", content: "" });
    });

    it("converts text content parts", () => {
      const msg: OpenAIMessage = {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      };
      const result = fromOpenAIMessage(msg);
      expect(result.content).toEqual([{ type: "text", text: "Hello" }]);
    });

    it("converts image_url content parts", () => {
      const msg: OpenAIMessage = {
        role: "user",
        content: [{
          type: "image_url",
          image_url: { url: "https://example.com/img.png", detail: "high" },
        }],
      };
      const result = fromOpenAIMessage(msg);
      expect(result.content).toEqual([{
        type: "image_url",
        image_url: { url: "https://example.com/img.png", detail: "high" },
      }]);
    });

    it("converts tool_call_id", () => {
      const msg: OpenAIMessage = {
        role: "tool",
        content: "result",
        tool_call_id: "call_123",
      };
      const result = fromOpenAIMessage(msg);
      expect(result.toolCallId).toBe("call_123");
    });

    it("converts tool_calls", () => {
      const msg: OpenAIMessage = {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_1",
          type: "function",
          function: { name: "get_weather", arguments: '{"city":"Hanoi"}' },
        }],
      };
      const result = fromOpenAIMessage(msg);
      expect(result.toolCalls).toEqual([{
        id: "call_1",
        name: "get_weather",
        args: { city: "Hanoi" },
      }]);
    });

    it("converts developer role", () => {
      const msg: OpenAIMessage = { role: "developer", content: "System prompt" };
      const result = fromOpenAIMessage(msg);
      expect(result.role).toBe("developer");
    });

    it("converts refusal", () => {
      const msg: OpenAIMessage = {
        role: "assistant",
        content: null,
        refusal: "I cannot help with that",
      };
      const result = fromOpenAIMessage(msg);
      expect(result.refusal).toBe("I cannot help with that");
    });
  });

  describe("toOpenAIMessage", () => {
    it("converts simple string content", () => {
      const msg = { role: "user" as const, content: "Hello" };
      const result = toOpenAIMessage(msg);
      expect(result).toEqual({ role: "user", content: "Hello" });
    });

    it("converts empty content to null", () => {
      const msg = { role: "assistant" as const, content: "" };
      const result = toOpenAIMessage(msg);
      expect(result.content).toBeNull();
    });

    it("converts toolCallId", () => {
      const msg = {
        role: "tool" as const,
        content: "result",
        toolCallId: "call_123",
      };
      const result = toOpenAIMessage(msg);
      expect(result.tool_call_id).toBe("call_123");
    });

    it("converts toolCalls", () => {
      const msg = {
        role: "assistant" as const,
        content: "",
        toolCalls: [{
          id: "call_1",
          name: "get_weather",
          args: { city: "Hanoi" },
        }],
      };
      const result = toOpenAIMessage(msg);
      expect(result.tool_calls).toEqual([{
        id: "call_1",
        type: "function",
        function: { name: "get_weather", arguments: '{"city":"Hanoi"}' },
      }]);
    });

    it("converts refusal", () => {
      const msg = {
        role: "assistant" as const,
        content: "",
        refusal: "I cannot help with that",
      };
      const result = toOpenAIMessage(msg);
      expect(result.refusal).toBe("I cannot help with that");
    });
  });

  describe("fromOpenAIResponse", () => {
    it("converts basic response", () => {
      const res: OpenAIResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "gpt-4",
        choices: [{
          index: 0,
          message: { role: "assistant", content: "Hello!" },
          finish_reason: "stop",
        }],
      };
      const result = fromOpenAIResponse(res);
      expect(result).toEqual({
        content: "Hello!",
        finishReason: "stop",
        id: "chatcmpl-123",
        model: "gpt-4",
        created: 1234567890,
      });
    });

    it("converts usage with details", () => {
      const res: OpenAIResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "gpt-4",
        choices: [{
          index: 0,
          message: { role: "assistant", content: "Hello!" },
          finish_reason: "stop",
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
          prompt_tokens_details: { cached_tokens: 3 },
          completion_tokens_details: { reasoning_tokens: 2 },
        },
      };
      const result = fromOpenAIResponse(res);
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        cachedTokens: 3,
        reasoningTokens: 2,
        audioTokens: 0,
      });
    });

    it("converts tool_calls", () => {
      const res: OpenAIResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "gpt-4",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Hanoi"}' },
            }],
          },
          finish_reason: "tool_calls",
        }],
      };
      const result = fromOpenAIResponse(res);
      expect(result.toolCalls).toEqual([{
        id: "call_1",
        name: "get_weather",
        args: { city: "Hanoi" },
      }]);
      expect(result.finishReason).toBe("tool_calls");
    });

    it("converts system_fingerprint", () => {
      const res: OpenAIResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "gpt-4",
        choices: [{
          index: 0,
          message: { role: "assistant", content: "Hello!" },
          finish_reason: "stop",
        }],
        system_fingerprint: "fp_abc123",
      };
      const result = fromOpenAIResponse(res);
      expect(result.systemFingerprint).toBe("fp_abc123");
    });

    it("converts refusal", () => {
      const res: OpenAIResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "gpt-4",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: null,
            refusal: "I cannot help with that",
          },
          finish_reason: "stop",
        }],
      };
      const result = fromOpenAIResponse(res);
      expect(result.refusal).toBe("I cannot help with that");
    });

    it("returns empty content for empty choices", () => {
      const res: OpenAIResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "gpt-4",
        choices: [],
      };
      const result = fromOpenAIResponse(res);
      expect(result.content).toBe("");
    });
  });

  describe("toOpenAIResponse", () => {
    it("converts basic response", () => {
      const res = {
        content: "Hello!",
        finishReason: "stop" as const,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };
      const result = toOpenAIResponse(res);
      expect(result.object).toBe("chat.completion");
      expect(result.choices[0].message.content).toBe("Hello!");
      expect(result.choices[0].finish_reason).toBe("stop");
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      });
    });

    it("generates id and created when missing", () => {
      const res = { content: "Hello!" };
      const result = toOpenAIResponse(res);
      expect(result.id).toMatch(/^gen-/);
      expect(result.created).toBeGreaterThan(0);
    });

    it("converts tool_calls", () => {
      const res = {
        content: "",
        toolCalls: [{
          id: "call_1",
          name: "get_weather",
          args: { city: "Hanoi" },
        }],
      };
      const result = toOpenAIResponse(res);
      expect(result.choices[0].message.tool_calls).toEqual([{
        id: "call_1",
        type: "function",
        function: { name: "get_weather", arguments: '{"city":"Hanoi"}' },
      }]);
    });

    it("converts refusal", () => {
      const res = {
        content: "",
        refusal: "I cannot help with that",
      };
      const result = toOpenAIResponse(res);
      expect(result.choices[0].message.refusal).toBe("I cannot help with that");
    });

    it("converts usage with cached/reasoning tokens", () => {
      const res = {
        content: "Hello!",
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
          cachedTokens: 3,
          reasoningTokens: 2,
        },
      };
      const result = toOpenAIResponse(res);
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        prompt_tokens_details: { cached_tokens: 3 },
        completion_tokens_details: { reasoning_tokens: 2 },
      });
    });

    it("maps error finishReason to stop", () => {
      const res = { content: "Hello!", finishReason: "error" as const };
      const result = toOpenAIResponse(res);
      expect(result.choices[0].finish_reason).toBe("stop");
    });
  });

  describe("fromOpenAIStreamChunk", () => {
    it("converts text content", () => {
      const chunk: OpenAIStreamChunk = {
        id: "chatcmpl-123",
        object: "chat.completion.chunk",
        created: 1234567890,
        model: "gpt-4",
        choices: [{
          index: 0,
          delta: { content: "Hello" },
          finish_reason: null,
        }],
      };
      const events = fromOpenAIStreamChunk(chunk);
      expect(events).toEqual([{ type: "text", content: "Hello" }]);
    });

    it("converts tool call start", () => {
      const chunk: OpenAIStreamChunk = {
        id: "chatcmpl-123",
        object: "chat.completion.chunk",
        created: 1234567890,
        model: "gpt-4",
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{
              index: 0,
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: "" },
            }],
          },
          finish_reason: null,
        }],
      };
      const events = fromOpenAIStreamChunk(chunk);
      expect(events).toEqual([{
        type: "tool_call",
        id: "call_1",
        name: "get_weather",
        args: {},
      }]);
    });

    it("converts tool call argument delta", () => {
      const chunk: OpenAIStreamChunk = {
        id: "chatcmpl-123",
        object: "chat.completion.chunk",
        created: 1234567890,
        model: "gpt-4",
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{
              index: 0,
              function: { arguments: '{"city":' },
            }],
          },
          finish_reason: null,
        }],
      };
      const events = fromOpenAIStreamChunk(chunk);
      expect(events).toEqual([{
        type: "tool_call",
        id: "",
        name: undefined,
        args: { __delta: '{"city":', __index: 0 },
      }]);
    });

    it("converts finish reason", () => {
      const chunk: OpenAIStreamChunk = {
        id: "chatcmpl-123",
        object: "chat.completion.chunk",
        created: 1234567890,
        model: "gpt-4",
        choices: [{
          index: 0,
          delta: {},
          finish_reason: "stop",
        }],
      };
      const events = fromOpenAIStreamChunk(chunk);
      expect(events).toEqual([{ type: "finish", reason: "stop" }]);
    });

    it("converts usage in final chunk", () => {
      const chunk: OpenAIStreamChunk = {
        id: "chatcmpl-123",
        object: "chat.completion.chunk",
        created: 1234567890,
        model: "gpt-4",
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };
      const events = fromOpenAIStreamChunk(chunk);
      expect(events).toEqual([{
        type: "usage",
        inputTokens: 10,
        outputTokens: 5,
      }]);
    });
  });

  describe("fromAnthropicMessage", () => {
    it("converts string content", () => {
      const msg = { role: "user" as const, content: "Hello" };
      const result = fromAnthropicMessage(msg);
      expect(result).toEqual({ role: "user", content: "Hello" });
    });

    it("converts array content", () => {
      const msg = {
        role: "assistant" as const,
        content: [{ type: "text", text: "Hello" }],
      };
      const result = fromAnthropicMessage(msg);
      expect(result.content).toEqual([{ type: "text", text: "Hello" }]);
    });
  });

  describe("fromOpenAIError", () => {
    it("converts authentication_error to AuthenticationError", () => {
      const err = {
        error: {
          message: "Invalid API key",
          type: "authentication_error",
          param: null,
          code: "invalid_api_key",
        },
      };
      const result = fromOpenAIError(err);
      expect(result.name).toBe("AuthenticationError");
      expect(result.message).toBe("Invalid API key");
      expect(result.retryable).toBe(false);
    });

    it("converts rate_limit_error to RateLimitError", () => {
      const err = {
        error: {
          message: "Rate limit exceeded",
          type: "rate_limit_error",
          param: null,
          code: "rate_limit_exceeded",
        },
      };
      const result = fromOpenAIError(err);
      expect(result.name).toBe("RateLimitError");
      expect(result.message).toBe("Rate limit exceeded");
      expect(result.retryable).toBe(true);
    });

    it("converts invalid_request_error to ValidationError", () => {
      const err = {
        error: {
          message: "Invalid model",
          type: "invalid_request_error",
          param: "model",
          code: "invalid_model",
        },
      };
      const result = fromOpenAIError(err);
      expect(result.name).toBe("ValidationError");
      expect(result.message).toBe("Invalid model");
      expect(result.retryable).toBe(false);
    });

    it("converts permission_denied to PermissionDeniedError", () => {
      const err = {
        error: {
          message: "Access denied",
          type: "permission_denied",
          param: null,
          code: "access_denied",
        },
      };
      const result = fromOpenAIError(err);
      expect(result.name).toBe("PermissionDeniedError");
      expect(result.retryable).toBe(false);
    });

    it("converts server_error to NetworkError", () => {
      const err = {
        error: {
          message: "Server error",
          type: "server_error",
          param: null,
          code: "server_error",
        },
      };
      const result = fromOpenAIError(err);
      expect(result.name).toBe("NetworkError");
      expect(result.retryable).toBe(true);
    });

    it("converts unknown type to NetworkError", () => {
      const err = {
        error: {
          message: "Unknown error",
          type: "unknown_type",
          param: null,
          code: null,
        },
      };
      const result = fromOpenAIError(err);
      expect(result.name).toBe("NetworkError");
      expect(result.retryable).toBe(true);
    });
  });
});
