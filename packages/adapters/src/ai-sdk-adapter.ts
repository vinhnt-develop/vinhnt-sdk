import { generateText, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type {
  ModelProvider, ModelRequest, ModelResponse, ModelStreamEvent,
  ToolDefinition, ChatMessage,
} from "@vinhnt-sdk/core";
import { countTokensSafe } from "./tokenizer.js";
import { withRetry } from "./retry.js";

export type AiProvider = "openai" | "anthropic" | "gemini" | "ollama" | "openai-compatible" | "openrouter";

export const AI_SDK_VERSION = 7;

type AiSdkMessage = {
  role: string;
  content: string | Array<{ type: string; text?: string; image?: string; mimeType?: string }>;
  toolCallId?: string;
  toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>;
};

export class AiSdkModelProvider implements ModelProvider {
  readonly model: string;
  /** No static pricing/context tables — provider-specific values are filled at runtime. */
  readonly pricing: undefined = undefined;
  readonly contextLimit: number | undefined = undefined;
  readonly maxRetries: number;
  private readonly modelObj: unknown;

  constructor(
    provider: AiProvider,
    model: string,
    apiKey?: string,
    baseUrl?: string,
    maxRetries?: number,
    private readonly extraHeaders?: Record<string, string>,
    private readonly extraBody?: Record<string, unknown>,
  ) {
    this.model = model;
    this.modelObj = this.resolveModel(provider, model, apiKey, baseUrl);
    this.maxRetries = maxRetries ?? 3;
  }

  private resolveModel(provider: AiProvider, model: string, apiKey?: string, baseUrl?: string): unknown {
    const opts: Record<string, string | undefined> = {};
    if (apiKey) opts.apiKey = apiKey;
    if (baseUrl) opts.baseURL = baseUrl;

    // Extra body fields (config `provider.body`) are merged into every POST body
    // via a fetch middleware, since the AI SDK providers expose no generic
    // request-body option. Non-POST requests pass through untouched.
    const injectBody = this.extraBody && Object.keys(this.extraBody).length > 0
      ? async (input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> => {
          const isPost = (init?.method ?? "GET").toUpperCase() === "POST";
          if (isPost && init?.body && typeof init.body === "string") {
            try {
              const parsed = JSON.parse(init.body) as Record<string, unknown>;
              init.body = JSON.stringify({ ...parsed, ...this.extraBody });
            } catch {
              // body not JSON — leave unchanged
            }
          }
          return fetch(input, init);
        }
      : undefined;

    switch (provider) {
      case "openai":
      case "ollama":
      case "openai-compatible":
      case "openrouter": {
        // @ai-sdk/openai@4 requires API key even for local endpoints
        if (!opts.apiKey) opts.apiKey = "sk-dummy";
        // Auto-set baseURL for OpenRouter
        if (provider === "openrouter" && !opts.baseURL) {
          opts.baseURL = "https://openrouter.ai/api/v1";
        }
        const p = createOpenAI({
          ...opts,
          ...(this.extraHeaders ? { headers: this.extraHeaders } : {}),
          ...(injectBody ? { fetch: injectBody } : {}),
        } as never);
        // Use .chat() for Chat Completions API (not Responses API default)
        return p.chat(model);
      }
      case "anthropic": {
        const p = createAnthropic({
          ...opts,
          ...(this.extraHeaders ? { headers: this.extraHeaders } : {}),
          ...(injectBody ? { fetch: injectBody } : {}),
        } as never);
        return p(model);
      }
      case "gemini": {
        const p = createGoogleGenerativeAI(opts as never);
        return p(model);
      }
    }
  }

  /** Extra JSON fields merged into every request body (provider-specific). */
  get body(): Record<string, unknown> | undefined {
    return this.extraBody;
  }

  async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    const { system, messages } = this.splitSystemMessages(request.messages);
    const result = await withRetry(() => generateText({
      model: this.modelObj as never,
      system: system || undefined,
      messages: this.toAiMessages(messages) as never,
      tools: this.toAiTools(request.tools) as never,
      abortSignal: signal,
    } as never), { maxAttempts: this.maxRetries });

    const usage = result.usage
      ? { inputTokens: result.usage.inputTokens ?? 0, outputTokens: result.usage.outputTokens ?? 0 }
      : undefined;

    return {
      content: result.text,
      toolCalls: (result.toolCalls as Array<{ toolCallId: string; toolName: string; input: unknown }>)?.map((tc) => ({
        id: tc.toolCallId,
        name: tc.toolName,
        args: tc.input as Record<string, unknown>,
      })),
      usage,
    };
  }

  async *stream(request: ModelRequest, signal?: AbortSignal): AsyncIterable<ModelStreamEvent> {
    const { system, messages } = this.splitSystemMessages(request.messages);

    let result: Awaited<ReturnType<typeof streamText>>;
    try {
      result = await withRetry(() => Promise.resolve(streamText({
        model: this.modelObj as never,
        system: system || undefined,
        messages: this.toAiMessages(messages) as never,
        tools: this.toAiTools(request.tools) as never,
        abortSignal: signal,
      } as never)), { maxAttempts: this.maxRetries });
    } catch (err) {
      yield { type: "error" as const, error: err instanceof Error ? err.message : String(err) };
      return;
    }

    let usage: { inputTokens: number; outputTokens: number } | undefined;

    try {
      for await (const part of result.fullStream) {
        switch (part.type) {
          case "text-delta":
            yield { type: "text" as const, content: part.text as string };
            break;
          case "tool-call":
            yield {
              type: "tool_call" as const,
              id: part.toolCallId as string,
              name: part.toolName as string,
              args: (part.input ?? {}) as Record<string, unknown>,
            };
            break;
          case "finish":
            if (part.totalUsage) {
              usage = {
                inputTokens: part.totalUsage.inputTokens ?? 0,
                outputTokens: part.totalUsage.outputTokens ?? 0,
              };
            }
            break;
          case "error":
            yield { type: "error" as const, error: typeof part.error === "string" ? part.error : String(part.error) };
            return;
        }
      }
    } catch (err) {
      yield { type: "error" as const, error: err instanceof Error ? err.message : String(err) };
      return;
    }

    if (usage) {
      yield { type: "usage" as const, ...usage };
    }
    yield { type: "done" as const };
  }

  countTokens(text: string): number {
    return countTokensSafe(text, this.model);
  }

  private splitSystemMessages(messages: readonly ChatMessage[]): { system: string; messages: readonly ChatMessage[] } {
    const systemParts: string[] = [];
    const rest: ChatMessage[] = [];
    for (const m of messages) {
      if (m.role === "system") {
        systemParts.push(m.content);
      } else {
        rest.push(m);
      }
    }
    return { system: systemParts.join("\n\n"), messages: rest };
  }

  private toAiMessages(messages: readonly ChatMessage[]): AiSdkMessage[] {
    return messages.flatMap((msg) => {
      // Tool messages: content must be array of tool-result parts in AI SDK v7
      if (msg.role === "tool") {
        return [{
          role: "tool",
          content: [{
            type: "tool-result",
            toolCallId: msg.toolCallId,
            toolName: msg.toolCallId ?? "",
            output: { type: "text", value: msg.content },
          }],
        } as never];
      }

      // Assistant messages with tool calls: use content array with tool-call parts
      if (msg.role === "assistant" && msg.toolCalls?.length) {
        const parts: Array<Record<string, unknown>> = [];
        if (msg.content) parts.push({ type: "text", text: msg.content });
        for (const tc of msg.toolCalls) {
          parts.push({
            type: "tool-call",
            toolCallId: tc.id,
            toolName: tc.name,
            input: tc.args,
          });
        }
        return [{
          role: "assistant",
          content: parts,
        } as never];
      }

      // Messages with content parts
      if (msg.contentParts && msg.contentParts.length > 0) {
        return [{
          role: msg.role,
          content: msg.contentParts.map((part) =>
            part.type === "image"
              ? { type: "image", image: part.image, mimeType: part.mimeType }
              : { type: "text", text: part.text },
          ),
        } as never];
      }

      return [{
        role: msg.role,
        content: msg.content,
      } as never];
    });
  }

  private toAiTools(tools: readonly ToolDefinition[] | undefined): Record<string, { description: string; parameters: unknown }> {
    if (!tools) return {};
    const result: Record<string, { description: string; parameters: unknown }> = {};
    for (const t of tools) {
      if (!t.inputSchema) continue;
      result[t.id] = {
        description: t.description ?? t.id,
        parameters: t.inputSchema,
      };
    }
    return result;
  }
}
