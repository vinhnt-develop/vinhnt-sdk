/**
 * Builder for OpenAI Chat Completions request bodies from a vinhnt-sdk
 * `ModelRequest` — raw fetch shape, zero AI SDK.
 */

import type {
  ChatMessage,
  ModelRequest,
  ToolDefinitionLike,
  ToolChoice,
  ResponseFormat,
  OpenAIMessage,
} from "@vinhnt-sdk/schema";
import { toOpenAIMessage } from "./convert.js";

/** OpenAI Chat Completions request body (as POSTed to /chat/completions). */
export interface OpenAICompatibleRequestBody {
  model: string;
  messages: readonly OpenAIMessage[];
  stream?: boolean;
  stream_options?: { readonly include_usage?: boolean };
  tools?: readonly {
    readonly type: "function";
    readonly function: {
      readonly name: string;
      readonly description: string;
      readonly parameters?: unknown;
      readonly strict?: boolean;
    };
  }[];
  tool_choice?: "auto" | "required" | "none" | { readonly type: "function"; readonly function: { readonly name: string } };
  parallel_tool_calls?: boolean;
  max_tokens?: number;
  max_completion_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | readonly string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  seed?: number;
  user?: string;
  logprobs?: boolean;
  top_logprobs?: number;
  reasoning_effort?: string;
  response_format?:
    | { readonly type: "json_object" }
    | { readonly type: "json_schema"; readonly json_schema: { readonly name: string; readonly schema: unknown; readonly strict?: boolean } };
}

/** Build options. */
export interface BuildRequestOptions {
  /** Model identifier sent in the body. Defaults to the provider's `model`. */
  readonly model?: string;
  /** Request a streaming response (`stream: true` + `stream_options.include_usage`). */
  readonly stream?: boolean;
  /** Track request/response token usage in streamed responses. */
  readonly includeUsage?: boolean;
}

function toToolChoice(choice: ToolChoice | undefined): OpenAICompatibleRequestBody["tool_choice"] {
  if (choice === undefined) return undefined;
  if (typeof choice === "string") return choice;
  return { type: "function", function: { name: choice.name } };
}

function toResponseFormat(format: ResponseFormat | undefined): OpenAICompatibleRequestBody["response_format"] {
  if (format === undefined) return undefined;
  if (format.type === "json_object") return { type: "json_object" };
  return {
    type: "json_schema",
    json_schema: {
      name: format.jsonSchema.name,
      schema: format.jsonSchema.schema,
      ...(format.jsonSchema.strict !== undefined ? { strict: format.jsonSchema.strict } : {}),
    },
  };
}

type OpenAICompatibleTool = NonNullable<OpenAICompatibleRequestBody["tools"]>[number];

function toOpenAITool(tool: ToolDefinitionLike): OpenAICompatibleTool {
  // Prefer the ready-made OpenAI tool shape when the tool exposes one
  // (ToolDefinitionLike already carries `type`/`function` passthrough).
  const fn = tool.function;
  if (fn) {
    return {
      type: "function",
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters,
        ...(fn.strict !== undefined ? { strict: fn.strict } : {}),
      },
    };
  }
  return {
    type: "function",
    function: {
      name: tool.name ?? tool.id,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  };
}

/**
 * Build an OpenAI Chat Completions request body from a vinhnt-sdk ModelRequest.
 *
 * Maps: messages, system (top-level), tools, tool_choice, parallel_tool_calls,
 * max_completion_tokens/max_tokens, temperature/top_p/stop, penalties,
 * logit_bias, seed, user, logprobs, reasoning_effort, response_format, and
 * (when streaming) `stream: true` + `stream_options.include_usage`.
 */
export function buildRequest(request: ModelRequest, opts?: BuildRequestOptions): OpenAICompatibleRequestBody {
  const messages = request.messages.map((m: ChatMessage) => toOpenAIMessage(m));
  if (request.system) {
    messages.unshift({ role: "system" as const, content: request.system });
  }

  const body: OpenAICompatibleRequestBody = {
    model: opts?.model ?? "",
    messages,
  };

  if (opts?.stream) {
    body.stream = true;
    if (opts.includeUsage) {
      body.stream_options = { include_usage: true };
    }
  }

  if (request.tools && request.tools.length > 0) {
    body.tools = request.tools.map(toOpenAITool) as OpenAICompatibleRequestBody["tools"];
  }

  const toolChoice = toToolChoice(request.toolChoice);
  if (toolChoice !== undefined) body.tool_choice = toolChoice;
  if (request.parallelToolCalls !== undefined) body.parallel_tool_calls = request.parallelToolCalls;

  if (request.maxCompletionTokens !== undefined) {
    body.max_completion_tokens = request.maxCompletionTokens;
  } else if (request.maxTokens !== undefined) {
    body.max_tokens = request.maxTokens;
  }

  if (request.temperature !== undefined) body.temperature = request.temperature;
  if (request.topP !== undefined) body.top_p = request.topP;
  if (request.stopSequences !== undefined && request.stopSequences.length > 0) {
    body.stop = request.stopSequences.length === 1 ? (request.stopSequences[0] as string) : request.stopSequences;
  }
  if (request.presencePenalty !== undefined) body.presence_penalty = request.presencePenalty;
  if (request.frequencyPenalty !== undefined) body.frequency_penalty = request.frequencyPenalty;
  if (request.logitBias) body.logit_bias = request.logitBias;
  if (request.seed !== undefined) body.seed = request.seed;
  if (request.user !== undefined) body.user = request.user;
  if (request.logprobs !== undefined) body.logprobs = request.logprobs;
  if (request.topLogprobs !== undefined) body.top_logprobs = request.topLogprobs;
  if (request.reasoningEffort !== undefined) body.reasoning_effort = request.reasoningEffort;

  const responseFormat = toResponseFormat(request.responseFormat);
  if (responseFormat !== undefined) body.response_format = responseFormat;

  return body;
}