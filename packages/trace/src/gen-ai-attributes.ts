/**
 * GenAI semantic-convention attribute layer — OTel `gen_ai.*` attributes
 * (ADK profile; research: .agents/research/ai-observability-research.md).
 *
 * Pure constants + tiny builders — zero runtime deps. Spans stay plain
 * `Span` objects (see ./tracing.ts); this module only supplies the standard
 * attribute keys/values so every producer agrees on names.
 *
 * Privacy: content capture is OPT-IN (`contentMode: "full"`). The default
 * `no_content` tier records metadata only (research "Privacy Tiers" #1).
 */

/** Attribute keys — core set (research table "Core Attributes"). */
export const GEN_AI_OPERATION_NAME = "gen_ai.operation.name";
export const GEN_AI_PROVIDER_NAME = "gen_ai.provider.name";
export const GEN_AI_REQUEST_MODEL = "gen_ai.request.model";
export const GEN_AI_RESPONSE_MODEL = "gen_ai.response.model";
export const GEN_AI_USAGE_INPUT_TOKENS = "gen_ai.usage.input_tokens";
export const GEN_AI_USAGE_OUTPUT_TOKENS = "gen_ai.usage.output_tokens";
export const GEN_AI_USAGE_REASONING_TOKENS = "gen_ai.usage.reasoning_tokens";
export const GEN_AI_RESPONSE_FINISH_REASONS = "gen_ai.response.finish_reasons";
export const GEN_AI_CONVERSATION_ID = "gen_ai.conversation.id";

/** Attribute keys — tool calls (gen_ai.tool.* span attributes). */
export const GEN_AI_TOOL_NAME = "gen_ai.tool.name";
export const GEN_AI_TOOL_CALL_ID = "gen_ai.tool.call.id";

/** Attribute keys — opt-in content capture (`contentMode: "full"` only). */
export const GEN_AI_INPUT_MESSAGES = "gen_ai.input.messages";
export const GEN_AI_OUTPUT_MESSAGES = "gen_ai.output.messages";

/**
 * Operation names — research "Agent Spans (5 types)" ∪ core-attributes
 * operations (`chat`, `text_completion`, `embeddings`).
 */
export const GEN_AI_OPERATIONS = {
  chat: "chat",
  textCompletion: "text_completion",
  embeddings: "embeddings",
  invokeAgent: "invoke_agent",
  executeTool: "execute_tool",
  retrieve: "retrieve",
  invokeWorkflow: "invoke_workflow",
} as const;

export type GenAiOperation = (typeof GEN_AI_OPERATIONS)[keyof typeof GEN_AI_OPERATIONS];

/**
 * Content capture tier — research privacy tiers #1 (default) and #4.
 * `metadata_only`/`redacted` belong to the PromptLogger work (out of scope).
 */
export type GenAiContentMode = "no_content" | "full";

/** Default cap for opt-in content attributes (chars). */
export const DEFAULT_GEN_AI_MAX_CONTENT_LENGTH = 4_096;

/** Custom (non-semconv) attribute keys used by the SDK — `vnt.` namespace. */
export const VNT_TRACE_CONTENT_TRUNCATED = "vnt.trace.content_truncated";

/** Structural usage subset of `ModelUsage` (kept dependency-free). */
export interface GenAiUsage {
  readonly promptTokens?: number | undefined;
  readonly completionTokens?: number | undefined;
  readonly reasoningTokens?: number | undefined;
}

export interface GenAiContentOptions {
  /** `no_content` (default) → content attributes are omitted entirely. */
  readonly contentMode?: GenAiContentMode | undefined;
  /** Truncation cap for content attributes. Default 4096 chars. */
  readonly maxContentLength?: number | undefined;
}

/** Conversation grouping attribute (emitted only when a session id exists). */
export function genAiConversationAttributes(
  conversationId?: string | undefined,
): Record<string, unknown> {
  return conversationId ? { [GEN_AI_CONVERSATION_ID]: conversationId } : {};
}

/** Attributes for the start of a chat/completion request. */
export function genAiChatRequestAttributes(params: {
  readonly provider: string;
  readonly model: string;
  readonly conversationId?: string | undefined;
}): Record<string, unknown> {
  return {
    [GEN_AI_OPERATION_NAME]: GEN_AI_OPERATIONS.chat,
    [GEN_AI_PROVIDER_NAME]: params.provider,
    [GEN_AI_REQUEST_MODEL]: params.model,
    ...genAiConversationAttributes(params.conversationId),
  };
}

/** Response-side attributes: served model + finish reasons. Omits unset fields. */
export function genAiResponseAttributes(params: {
  readonly model?: string | undefined;
  readonly finishReason?: string | undefined;
}): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  if (params.model) attrs[GEN_AI_RESPONSE_MODEL] = params.model;
  if (params.finishReason) attrs[GEN_AI_RESPONSE_FINISH_REASONS] = [params.finishReason];
  return attrs;
}

/** Token usage attributes — ints, only the fields actually present. */
export function genAiUsageAttributes(usage?: GenAiUsage | undefined): Record<string, unknown> {
  if (!usage) return {};
  const attrs: Record<string, unknown> = {};
  if (typeof usage.promptTokens === "number") attrs[GEN_AI_USAGE_INPUT_TOKENS] = usage.promptTokens;
  if (typeof usage.completionTokens === "number") attrs[GEN_AI_USAGE_OUTPUT_TOKENS] = usage.completionTokens;
  if (typeof usage.reasoningTokens === "number") attrs[GEN_AI_USAGE_REASONING_TOKENS] = usage.reasoningTokens;
  return attrs;
}

function truncateContent(value: string, maxLength: number): { readonly text: string; readonly truncated: boolean } {
  if (value.length <= maxLength) return { text: value, truncated: false };
  return { text: value.slice(0, maxLength), truncated: true };
}

/**
 * Opt-in content attributes — `no_content` (default) returns `{}`.
 * `full` emits `gen_ai.input.messages` / `gen_ai.output.messages` as
 * (possibly truncated) JSON strings + a `vnt.trace.content_truncated` flag.
 */
export function genAiContentAttributes(
  params: {
    /** Serialized conversation (request side), ready for JSON encoding. */
    readonly inputJson?: string | undefined;
    /** Serialized assistant output (response side). */
    readonly outputJson?: string | undefined;
  },
  options?: GenAiContentOptions | undefined,
): Record<string, unknown> {
  if ((options?.contentMode ?? "no_content") !== "full") return {};
  const max = options?.maxContentLength ?? DEFAULT_GEN_AI_MAX_CONTENT_LENGTH;
  const attrs: Record<string, unknown> = {};
  let truncated = false;
  if (params.inputJson !== undefined) {
    const r = truncateContent(params.inputJson, max);
    attrs[GEN_AI_INPUT_MESSAGES] = r.text;
    truncated = truncated || r.truncated;
  }
  if (params.outputJson !== undefined) {
    const r = truncateContent(params.outputJson, max);
    attrs[GEN_AI_OUTPUT_MESSAGES] = r.text;
    truncated = truncated || r.truncated;
  }
  if (truncated) attrs[VNT_TRACE_CONTENT_TRUNCATED] = true;
  return attrs;
}

/** Attributes for an `execute_tool` span. */
export function genAiToolAttributes(params: {
  readonly toolName: string;
  readonly toolCallId?: string | undefined;
  readonly conversationId?: string | undefined;
}): Record<string, unknown> {
  return {
    [GEN_AI_OPERATION_NAME]: GEN_AI_OPERATIONS.executeTool,
    [GEN_AI_TOOL_NAME]: params.toolName,
    ...genAiConversationAttributes(params.conversationId),
    ...(params.toolCallId ? { [GEN_AI_TOOL_CALL_ID]: params.toolCallId } : {}),
  };
}

/** Attributes for a top-level `invoke_agent` span. */
export function genAiInvokeAgentAttributes(params: {
  readonly conversationId?: string | undefined;
}): Record<string, unknown> {
  return {
    [GEN_AI_OPERATION_NAME]: GEN_AI_OPERATIONS.invokeAgent,
    ...genAiConversationAttributes(params.conversationId),
  };
}
