import { describe, it, expect } from "vitest";
import {
  GEN_AI_OPERATION_NAME,
  GEN_AI_PROVIDER_NAME,
  GEN_AI_REQUEST_MODEL,
  GEN_AI_RESPONSE_MODEL,
  GEN_AI_USAGE_INPUT_TOKENS,
  GEN_AI_USAGE_OUTPUT_TOKENS,
  GEN_AI_USAGE_REASONING_TOKENS,
  GEN_AI_RESPONSE_FINISH_REASONS,
  GEN_AI_CONVERSATION_ID,
  GEN_AI_TOOL_NAME,
  GEN_AI_TOOL_CALL_ID,
  GEN_AI_INPUT_MESSAGES,
  GEN_AI_OUTPUT_MESSAGES,
  GEN_AI_OPERATIONS,
  DEFAULT_GEN_AI_MAX_CONTENT_LENGTH,
  VNT_TRACE_CONTENT_TRUNCATED,
  genAiConversationAttributes,
  genAiChatRequestAttributes,
  genAiResponseAttributes,
  genAiUsageAttributes,
  genAiContentAttributes,
  genAiToolAttributes,
  genAiInvokeAgentAttributes,
} from "../src/gen-ai-attributes.js";
import { SpanRecorder, createSpan } from "../src/tracing.js";

describe("gen_ai semconv attribute keys (research ai-observability-research.md)", () => {
  it("TC01_core_keys_match_research_table", () => {
    expect(GEN_AI_OPERATION_NAME).toBe("gen_ai.operation.name");
    expect(GEN_AI_REQUEST_MODEL).toBe("gen_ai.request.model");
    expect(GEN_AI_RESPONSE_MODEL).toBe("gen_ai.response.model");
    expect(GEN_AI_PROVIDER_NAME).toBe("gen_ai.provider.name");
    expect(GEN_AI_USAGE_INPUT_TOKENS).toBe("gen_ai.usage.input_tokens");
    expect(GEN_AI_USAGE_OUTPUT_TOKENS).toBe("gen_ai.usage.output_tokens");
    expect(GEN_AI_USAGE_REASONING_TOKENS).toBe("gen_ai.usage.reasoning_tokens");
    expect(GEN_AI_RESPONSE_FINISH_REASONS).toBe("gen_ai.response.finish_reasons");
    expect(GEN_AI_CONVERSATION_ID).toBe("gen_ai.conversation.id");
    expect(GEN_AI_TOOL_NAME).toBe("gen_ai.tool.name");
    expect(GEN_AI_TOOL_CALL_ID).toBe("gen_ai.tool.call.id");
    expect(GEN_AI_INPUT_MESSAGES).toBe("gen_ai.input.messages");
    expect(GEN_AI_OUTPUT_MESSAGES).toBe("gen_ai.output.messages");
  });

  it("TC02_operations_cover_agent_spans_plus_core_ops", () => {
    expect(Object.values(GEN_AI_OPERATIONS)).toEqual([
      "chat",
      "text_completion",
      "embeddings",
      "invoke_agent",
      "execute_tool",
      "retrieve",
      "invoke_workflow",
    ]);
    expect(GEN_AI_OPERATIONS.chat).toBe("chat");
    expect(GEN_AI_OPERATIONS.executeTool).toBe("execute_tool");
    expect(GEN_AI_OPERATIONS.invokeAgent).toBe("invoke_agent");
  });
});

describe("gen_ai attribute builders", () => {
  it("TC03_chat_request_attributes", () => {
    expect(genAiChatRequestAttributes({ provider: "openai", model: "gpt-x" })).toEqual({
      "gen_ai.operation.name": "chat",
      "gen_ai.provider.name": "openai",
      "gen_ai.request.model": "gpt-x",
    });
    expect(
      genAiChatRequestAttributes({ provider: "openai", model: "gpt-x", conversationId: "s1" }),
    ).toHaveProperty("gen_ai.conversation.id", "s1");
  });

  it("TC04_conversation_attributes_only_when_present", () => {
    expect(genAiConversationAttributes(undefined)).toEqual({});
    expect(genAiConversationAttributes("")).toEqual({});
    expect(genAiConversationAttributes("sess_1")).toEqual({ "gen_ai.conversation.id": "sess_1" });
  });

  it("TC05_response_and_usage_attributes", () => {
    expect(genAiResponseAttributes({ model: "served-1", finishReason: "stop" })).toEqual({
      "gen_ai.response.model": "served-1",
      "gen_ai.response.finish_reasons": ["stop"],
    });
    expect(genAiResponseAttributes({})).toEqual({});
    expect(
      genAiUsageAttributes({ promptTokens: 11, completionTokens: 7, reasoningTokens: 3 }),
    ).toEqual({
      "gen_ai.usage.input_tokens": 11,
      "gen_ai.usage.output_tokens": 7,
      "gen_ai.usage.reasoning_tokens": 3,
    });
    expect(genAiUsageAttributes({ promptTokens: 0, completionTokens: 0 })).toEqual({
      "gen_ai.usage.input_tokens": 0,
      "gen_ai.usage.output_tokens": 0,
    });
    expect(genAiUsageAttributes(undefined)).toEqual({});
  });

  it("TC06_content_is_opt_in_no_content_by_default", () => {
    expect(genAiContentAttributes({ inputJson: "[]", outputJson: "[]" })).toEqual({});
    expect(
      genAiContentAttributes({ inputJson: "[]", outputJson: "[]" }, { contentMode: "no_content" }),
    ).toEqual({});
    const full = genAiContentAttributes(
      { inputJson: '[{"role":"user","content":"hi"}]', outputJson: '[{"role":"assistant","content":"yo"}]' },
      { contentMode: "full" },
    );
    expect(full[GEN_AI_INPUT_MESSAGES]).toContain('"hi"');
    expect(full[GEN_AI_OUTPUT_MESSAGES]).toContain('"yo"');
    expect(full[VNT_TRACE_CONTENT_TRUNCATED]).toBeUndefined();
  });

  it("TC07_content_truncation_sets_vnt_flag", () => {
    const long = "x".repeat(DEFAULT_GEN_AI_MAX_CONTENT_LENGTH + 10);
    const full = genAiContentAttributes({ inputJson: long }, { contentMode: "full" });
    expect((full[GEN_AI_INPUT_MESSAGES] as string).length).toBe(DEFAULT_GEN_AI_MAX_CONTENT_LENGTH);
    expect(full[VNT_TRACE_CONTENT_TRUNCATED]).toBe(true);

    const capped = genAiContentAttributes({ inputJson: long }, { contentMode: "full", maxContentLength: 10 });
    expect(capped[GEN_AI_INPUT_MESSAGES]).toBe("xxxxxxxxxx");
    expect(capped[VNT_TRACE_CONTENT_TRUNCATED]).toBe(true);
  });

  it("TC08_tool_and_agent_attributes", () => {
    expect(genAiToolAttributes({ toolName: "read_file", toolCallId: "c1" })).toEqual({
      "gen_ai.operation.name": "execute_tool",
      "gen_ai.tool.name": "read_file",
      "gen_ai.tool.call.id": "c1",
    });
    expect(genAiToolAttributes({ toolName: "read_file" })).not.toHaveProperty("gen_ai.tool.call.id");
    expect(genAiInvokeAgentAttributes({ conversationId: "s9" })).toEqual({
      "gen_ai.operation.name": "invoke_agent",
      "gen_ai.conversation.id": "s9",
    });
  });
});

describe("span start-time back-dating (recorded after the fact)", () => {
  it("TC09_startSpan_and_createSpan_accept_startTimeMs", () => {
    const recorder = new SpanRecorder();
    const backdated = recorder.startSpan("chat", "client", undefined, 1_700_000_000_000);
    expect(backdated.startTimeMs).toBe(1_700_000_000_000);
    const plain = createSpan("tool", "internal");
    expect(plain.startTimeMs).toBeGreaterThan(0);
    const explicit = createSpan("tool", "internal", undefined, undefined, 42);
    expect(explicit.startTimeMs).toBe(42);
  });
});
