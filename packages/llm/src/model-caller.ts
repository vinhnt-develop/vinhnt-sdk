/**
 * @module @vinhnt-sdk/model-caller
 * Model caller kernel primitive: build requests, run non-streaming/streaming
 * generation, fire model-call hooks, count tokens and emit token/cost events.
 */

import type { RunId, RequestContext, KnownRunEvent, ToolChoice, ResponseFormat, StreamOptions } from "@vinhnt-sdk/schema";
import { VntError, ConfigurationError } from "@vinhnt-sdk/schema";
import type {
  ChatMessage,
  ModelProvider,
  ModelRequest,
  ModelResponse,
  ModelRegistry,
} from "@vinhnt-sdk/schema";
import type { ToolDefinition } from "@vinhnt-sdk/tools";
import { getTextContent } from "@vinhnt-sdk/schema";

/**
 * Minimal structural hook surface used by the model caller.
 *
 * Hosts (e.g. core's `PluginManager`) only need to implement `fireHook` for
 * the model-call hook names; no direct dependency on the full plugin contract.
 */
export interface ModelCallerPluginHooks {
  fireHook(
    name: "onChatParams" | "onBeforeModelCall" | "onAfterModelCall" | "onTokenStreamed",
    data: Record<string, unknown>,
  ): Promise<{ modified: Record<string, unknown> } | null>;
}

/** Minimal structural logger used by the model caller (host Logger satisfies it). */
export interface ModelCallerLogger {
  info(message: string, ...args: unknown[]): void;
}

/** Dependencies required by {@link ModelCaller}. */
export interface ModelCallerDeps {
  defaultModel: ModelProvider;
  readonly modelRegistry: ModelRegistry | undefined;
  maxTokens: number;
  thinkingBudget: number;
  thinkingPrompt: string;
  readonly pluginManager: ModelCallerPluginHooks | undefined;
  readonly logger: ModelCallerLogger | undefined;
  emitEvent(event: Omit<KnownRunEvent, "sequence">, persist?: boolean): Promise<void>;
  modelForRun(runId: RunId): ModelProvider | undefined;
  setModelForRun(runId: RunId, model: ModelProvider): void;
  getAvailableTools(runId: RunId): readonly ToolDefinition[];
  /** Sampling temperature (0-2). Applied to every request unless overridden. */
  readonly temperature?: number;
  /** Nucleus sampling threshold (0-1). Applied to every request unless overridden. */
  readonly topP?: number;
  /** OpenAI: tool_choice — controls tool calling behavior. */
  readonly toolChoice?: ToolChoice;
  /** OpenAI: parallel_tool_calls — whether to allow parallel tool calls. */
  readonly parallelToolCalls?: boolean;
  /** OpenAI: response_format — controls output format. */
  readonly responseFormat?: ResponseFormat;
  /** OpenAI: stream_options — options for streaming. */
  readonly streamOptions?: StreamOptions;
  /** OpenAI: presence_penalty — penalizes tokens based on presence. */
  readonly presencePenalty?: number;
  /** OpenAI: frequency_penalty — penalizes tokens based on frequency. */
  readonly frequencyPenalty?: number;
  /** OpenAI: logit_bias — token-level logit biases. */
  readonly logitBias?: Record<string, number>;
  /** OpenAI: seed — for reproducible outputs. */
  readonly seed?: number;
  /** OpenAI: user — end-user identifier. */
  readonly user?: string;
  /** OpenAI: logprobs — return log probabilities. */
  readonly logprobs?: boolean;
  /** OpenAI: top_logprobs — number of top logprobs per token. */
  readonly topLogprobs?: number;
  /** OpenAI: max_completion_tokens — for o-series models. */
  readonly maxCompletionTokens?: number;
  /** OpenAI: reasoning_effort — controls reasoning token budget. */
  readonly reasoningEffort?: string;
}

type TypedEvent<Type extends string, Data> = {
  id: string; runId: RunId; type: Type; occurredAt: string; traceId: string; data: Data;
};

function emitTC(runId: RunId, traceId: string, data: {
  inputTokens: number; outputTokens?: number; reasoningTokens?: number; cacheReadTokens?: number; cacheWriteTokens?: number; step: number; source?: "local" | "api";
}): TypedEvent<"token.counted", typeof data> {
  return { id: crypto.randomUUID(), runId, type: "token.counted", occurredAt: new Date().toISOString(), traceId, data };
}

function emitMC(runId: RunId, traceId: string, data: {
  inputTokens: number; outputTokens: number; cost: number; model: string; provider?: string; durationMs: number; step: number;
}): TypedEvent<"model.cost", typeof data> {
  return { id: crypto.randomUUID(), runId, type: "model.cost", occurredAt: new Date().toISOString(), traceId, data };
}

/** Runs model generation (streaming and non-streaming) with hooks, token counting and cost/token events. */
export class ModelCaller {
  constructor(private readonly deps: ModelCallerDeps) {
    if (!deps.defaultModel?.model?.trim()) {
      throw new ConfigurationError("ModelCaller requires a defaultModel with non-empty model string");
    }
  }

  /** Swap the default model at runtime (config hot-reload). */
  setDefaultModel(model: ModelProvider): void {
    this.deps.defaultModel = model;
  }

  /** Swap runtime-tunable generation settings at runtime (config hot-reload). */
  setRuntimeOptions(options: Partial<Pick<ModelCallerDeps, "maxTokens" | "thinkingBudget" | "thinkingPrompt">>): void {
    if (options.maxTokens !== undefined) this.deps.maxTokens = options.maxTokens;
    if (options.thinkingBudget !== undefined) this.deps.thinkingBudget = options.thinkingBudget;
    if (options.thinkingPrompt !== undefined) this.deps.thinkingPrompt = options.thinkingPrompt;
  }

  getDefaultModel(): ModelProvider {
    return this.deps.defaultModel;
  }

  /**
   * Swap the active model for a run (P1-2 failover).
   * Subsequent `callModelStream` for this runId will use `model`.
   */
  setModelForRun(runId: RunId, model: ModelProvider): void {
    this.deps.setModelForRun(runId, model);
  }

  resolveAgentModel(agent: { profile: { model?: string } }, runId?: RunId): ModelProvider {
    const preferred = agent?.profile?.model;
    if (preferred && this.deps.modelRegistry) {
      const provider = this.deps.modelRegistry.get(preferred);
      if (provider) {
        if (runId) this.deps.setModelForRun(runId, provider);
        return provider;
      }
    }
    if (runId) this.deps.setModelForRun(runId, this.deps.defaultModel);
    return this.deps.defaultModel;
  }

  /** Resolve a model provider by explicit provider name from the request or context. */
  resolveProvider(providerName: string | undefined, modelOverride?: string): ModelProvider | undefined {
    if (!providerName || !this.deps.modelRegistry) return undefined;
    // If a model override is provided, try provider+model combo first
    if (modelOverride) {
      const byId = this.deps.modelRegistry.get(modelOverride);
      if (byId) return byId;
    }
    // Fall back to first provider matching the provider name
    const candidates = this.deps.modelRegistry.getByProvider(providerName);
    return candidates[0]?.provider;
  }

  getActiveModel(runId: RunId): ModelProvider {
    return this.deps.modelForRun(runId) ?? this.deps.defaultModel;
  }

  async callModelStream(
    messages: ChatMessage[],
    step: number,
    runId: RunId,
    ctx: RequestContext,
    signal: AbortSignal,
    agentMaxTokens?: number,
    disableTools?: boolean,
    toolChoiceOverride?: ToolChoice,
  ): Promise<ModelResponse> {
    const availableTools = disableTools ? [] : this.deps.getAvailableTools(runId);
    // Last/no-tools step: force tool_choice=none so the model cannot emit calls
    // that would be dropped. Repair paths may override with "required".
    const effectiveToolChoice: ToolChoice | undefined = toolChoiceOverride
      ?? (disableTools ? "none" : this.deps.toolChoice);
    const thinkingBudget = this.deps.thinkingBudget > 0 ? this.deps.thinkingBudget : undefined;
    // Resolve provider from context overrides or agent config
    const resolvedProvider = ctx.overrides?.provider;
    const resolvedModel = ctx.overrides?.model;
    let request: ModelRequest = {
      messages, tools: availableTools, maxTokens: agentMaxTokens ?? this.deps.maxTokens,
      ...(resolvedProvider ? { provider: resolvedProvider } : {}),
      ...(resolvedModel ? { model: resolvedModel } : {}),
      ...(thinkingBudget !== undefined ? { thinkingBudget } : {}),
      ...(this.deps.thinkingPrompt ? { thinkingPrompt: this.deps.thinkingPrompt } : {}),
      // LLM generation settings
      ...(this.deps.temperature !== undefined ? { temperature: this.deps.temperature } : {}),
      ...(this.deps.topP !== undefined ? { topP: this.deps.topP } : {}),
      // OpenAI fields passthrough
      ...(effectiveToolChoice !== undefined ? { toolChoice: effectiveToolChoice } : {}),
      ...(this.deps.parallelToolCalls !== undefined ? { parallelToolCalls: this.deps.parallelToolCalls } : {}),
      ...(this.deps.responseFormat !== undefined ? { responseFormat: this.deps.responseFormat } : {}),
      ...(this.deps.streamOptions !== undefined ? { streamOptions: this.deps.streamOptions } : {}),
      ...(this.deps.presencePenalty !== undefined ? { presencePenalty: this.deps.presencePenalty } : {}),
      ...(this.deps.frequencyPenalty !== undefined ? { frequencyPenalty: this.deps.frequencyPenalty } : {}),
      ...(this.deps.logitBias !== undefined ? { logitBias: this.deps.logitBias } : {}),
      ...(this.deps.seed !== undefined ? { seed: this.deps.seed } : {}),
      ...(this.deps.user !== undefined ? { user: this.deps.user } : {}),
      ...(this.deps.logprobs !== undefined ? { logprobs: this.deps.logprobs } : {}),
      ...(this.deps.topLogprobs !== undefined ? { topLogprobs: this.deps.topLogprobs } : {}),
      ...(this.deps.maxCompletionTokens !== undefined ? { maxCompletionTokens: this.deps.maxCompletionTokens } : {}),
      ...(this.deps.reasoningEffort !== undefined ? { reasoningEffort: this.deps.reasoningEffort } : {}),
    };

    const chatParamsResult = await this.deps.pluginManager?.fireHook("onChatParams", {
      request: request as unknown as Record<string, unknown>,
    });
    if (chatParamsResult?.modified?.request) {
      request = chatParamsResult.modified.request as unknown as ModelRequest;
    }
    // P1-F: onBeforeModelCall — intercept/modify the request right before the model call.
    const beforeCallResult = await this.deps.pluginManager?.fireHook("onBeforeModelCall", {
      request: request as unknown as Record<string, unknown>,
    });
    if (beforeCallResult?.modified?.request) {
      request = beforeCallResult.modified.request as unknown as ModelRequest;
    }

    // Resolve model: explicit provider from request/ctx takes precedence over agent config
    let model = this.getActiveModel(runId);
    if (resolvedProvider) {
      const explicit = this.resolveProvider(resolvedProvider, resolvedModel);
      if (explicit) {
        model = explicit;
        if (runId) this.deps.setModelForRun(runId, model);
      }
    }
    const modelName = model.model ?? "unknown";
    const startTime = performance.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let reasoningTokens = 0;
    let cacheReadTokens = 0;
    let cacheWriteTokens = 0;

    // Emit llm.request with request parameters for trajectory visibility.
    // Capture POST-hook messages/tools (what the model will actually see).
    // Shape: params (generation) + prompt (assembly) + optional snapshot — AGENTS.md §2b.
    if (runId) {
      const snapMessages = request.messages ?? messages;
      const promptSystem = snapMessages[0]?.role === "system"
        ? getTextContent(snapMessages[0].content)
        : undefined;
      const genParams = {
        ...(request.temperature != null ? { temperature: request.temperature } : {}),
        ...(request.maxTokens != null ? { maxTokens: request.maxTokens } : {}),
        ...(request.maxCompletionTokens != null ? { maxCompletionTokens: request.maxCompletionTokens } : {}),
        ...(request.topP != null ? { topP: request.topP } : {}),
        ...(request.stopSequences?.length ? { stopSequences: [...request.stopSequences] } : {}),
        ...(request.frequencyPenalty != null ? { frequencyPenalty: request.frequencyPenalty } : {}),
        ...(request.presencePenalty != null ? { presencePenalty: request.presencePenalty } : {}),
        ...(request.toolChoice !== undefined ? { toolChoice: request.toolChoice as string | Record<string, unknown> } : {}),
        ...(request.parallelToolCalls !== undefined ? { parallelToolCalls: request.parallelToolCalls } : {}),
        ...(request.responseFormat !== undefined ? { responseFormat: request.responseFormat as Record<string, unknown> } : {}),
        ...(request.seed != null ? { seed: request.seed } : {}),
        ...(request.user != null ? { user: request.user } : {}),
        ...(request.logitBias ? { logitBias: request.logitBias } : {}),
        ...(request.logprobs !== undefined ? { logprobs: request.logprobs } : {}),
        ...(request.topLogprobs != null ? { topLogprobs: request.topLogprobs } : {}),
        ...(request.reasoningEffort != null ? { reasoningEffort: request.reasoningEffort } : {}),
      };
      await this.deps.emitEvent({
        id: crypto.randomUUID(), runId, type: "llm.request" as const,
        occurredAt: new Date().toISOString(), sequence: 0, traceId: ctx.traceId,
        data: {
          step,
          model: modelName,
          provider: model.provider,
          ...(Object.keys(genParams).length ? { params: genParams } : {}),
          prompt: {
            systemPromptLength: promptSystem ? promptSystem.length : undefined,
            systemPrompt: promptSystem,
            messageCount: snapMessages.length,
            toolCount: request.tools?.length,
          },
          // ─── Snapshot (wire + origin split) ─────────────────────
          messages: snapMessages.map(m => ({
            role: m.role,
            content: getTextContent(m.content),
            ...(m.toolCalls?.length ? { toolCalls: m.toolCalls } : {}),
            ...(m.toolCallId ? { toolCallId: m.toolCallId } : {}),
          })),
          tools: request.tools?.map(t => {
            const origin = {
              ...(t.id ? { id: t.id } : {}),
              ...(t.risk ? { risk: t.risk } : {}),
              ...(t.metadata ? { metadata: t.metadata } : {}),
              ...(t.annotations ? { annotations: t.annotations as Record<string, unknown> } : {}),
            };
            return {
              name: t.function?.name ?? t.name ?? t.id,
              description: t.description,
              parameters: (t.function?.parameters ?? t.inputSchema) as Record<string, unknown>,
              ...(Object.keys(origin).length ? { origin } : {}),
            };
          }),
          ...(ctx.overrides?.selection ? { selection: ctx.overrides.selection } : {}),
          ...(ctx.overrides?.agent ? { agent: ctx.overrides.agent } : {}),
        },
      } as Omit<KnownRunEvent, "sequence">);
    }

    const modelHasTokens = !!model.countTokens;
    // RV-42: the input count here is only a local FALLBACK estimate — the
    // authoritative `token.counted` is emitted exactly once per call, after the
    // model call, from the provider-reported usage (or this estimate).
    if (modelHasTokens) {
      inputTokens = messages.reduce((sum, m) => sum + model.countTokens!(getTextContent(m.content)), 0);
    }

    let content = "";
    let thinkingContent = ""; // Aggregate thinking tokens into one event
    const toolCalls: { id: string; name: string; args: unknown }[] = [];
    let finishReason: string | undefined;

    if (!model.stream) {
      const res = await model.generate(request, signal);
      // P1-F: onAfterModelCall — intercept/modify the response after the model call.
      const afterCallResult = await this.deps.pluginManager?.fireHook("onAfterModelCall", {
        response: res as unknown as Record<string, unknown>,
      });
      const effectiveRes = (afterCallResult?.modified?.response ?? res) as ModelResponse;
      let source: "api" | "local" = "api";
      const input = effectiveRes.usage?.inputTokens ?? effectiveRes.usage?.promptTokens ?? 0;
      const output = effectiveRes.usage?.outputTokens ?? effectiveRes.usage?.completionTokens ?? 0;
      const reasoning = effectiveRes.usage?.reasoningTokens ?? 0;
      const usageAny = effectiveRes.usage as Record<string, unknown> | undefined;
      const cacheRead = (typeof usageAny?.cacheReadTokens === 'number' ? usageAny.cacheReadTokens : 0) as number;
      const cacheWrite = (typeof usageAny?.cacheWriteTokens === 'number' ? usageAny.cacheWriteTokens : 0) as number;
      if (input > 0 && output > 0) {
        inputTokens = input;
        outputTokens = output;
        reasoningTokens = reasoning;
        cacheReadTokens = cacheRead;
        cacheWriteTokens = cacheWrite;
      } else if (modelHasTokens && effectiveRes.content) {
        const localOut = model.countTokens!(effectiveRes.content);
        if (input > 0) inputTokens = input;
        outputTokens = localOut;
        source = localOut === (output || -1) ? "api" : "local";
      }
      await this.deps.emitEvent(emitTC(runId, ctx.traceId, { inputTokens, outputTokens, ...(reasoningTokens > 0 ? { reasoningTokens } : {}), ...(cacheReadTokens > 0 ? { cacheReadTokens } : {}), ...(cacheWriteTokens > 0 ? { cacheWriteTokens } : {}), step, source }) as unknown as Omit<KnownRunEvent, "sequence">);
      const durationMs = Math.round(performance.now() - startTime);
      const cost = this.calculateCost(inputTokens, outputTokens, model) ?? 0;
      await this.deps.emitEvent(emitMC(runId, ctx.traceId, { inputTokens, outputTokens, cost, model: modelName, provider: model.provider, durationMs, step }) as unknown as Omit<KnownRunEvent, "sequence">);
      const p = model?.pricing;
      this.deps.logger?.info(`[llm] ${modelName}: ${inputTokens} in, ${outputTokens} out, $${cost.toFixed(6)}, ${durationMs}ms${p ? ` ($${p.input}/${p.output} per 1M)` : ""}`);

      // Emit llm.response with full response snapshot
      if (runId) {
        await this.deps.emitEvent({
          id: crypto.randomUUID(), runId, type: "llm.response" as const,
          occurredAt: new Date().toISOString(), sequence: 0, traceId: ctx.traceId,
          data: {
            step,
            content: effectiveRes.content ?? "",
            toolCalls: effectiveRes.toolCalls,
            finishReason: effectiveRes.finishReason,
            usage: {
              inputTokens,
              outputTokens,
              ...(reasoningTokens > 0 ? { reasoningTokens } : {}),
              ...(cacheReadTokens > 0 ? { cacheReadTokens } : {}),
              ...(cacheWriteTokens > 0 ? { cacheWriteTokens } : {}),
            },
            durationMs,
            model: modelName,
            provider: model.provider,
          },
        } as Omit<KnownRunEvent, "sequence">);
      }

      // RV-42: surface the authoritative usage on the response when the provider
      // did not already report it, so the run loop can budget without countTokens.
      return effectiveRes.usage
        ? effectiveRes
        : inputTokens > 0 || outputTokens > 0
          ? { ...effectiveRes, usage: { promptTokens: inputTokens, completionTokens: outputTokens } }
          : effectiveRes;
    }

    for await (const event of model.stream(request, signal)) {
      if (signal?.aborted) break;
      switch (event.type) {
        case "text":
          content += event.content;
          await this.deps.emitEvent({
            id: crypto.randomUUID(), runId, type: "token.streamed",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: { content: event.content, step },
          } as never, false);
          await this.deps.pluginManager?.fireHook("onTokenStreamed", { content: event.content, step });
          break;
        case "thinking":
          // RV-44: DeepSeek reasoner chain-of-thought — aggregate tokens
          // into one completed event (not per-token).
          thinkingContent += event.content;
          break;
        case "tool_call":
          toolCalls.push({ id: event.id, name: event.name, args: event.args });
          break;
        case "finish":
          // Carry finish_reason from the stream — needed for missed tool-call detection.
          finishReason = event.reason;
          break;
        case "usage":
          inputTokens = event.inputTokens;
          outputTokens = event.outputTokens;
          reasoningTokens = event.reasoningTokens ?? 0;
          cacheReadTokens = event.cacheReadTokens ?? 0;
          cacheWriteTokens = event.cacheWriteTokens ?? 0;
          break;
        case "done":
          break;
        case "error":
          // Surface as a structured, non-retryable error so the circuit
          // breaker never retries a truncated/malformed stream.
          throw new VntError(event.error, { retryable: false });
      }
    }

    // A cancelled stream must never commit partial content or partially
    // assembled tool calls as a successful response.
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    // Emit aggregated thinking content as one completed event (persist=true
    // so trajectory can attach thinkingContent to steps)
    if (thinkingContent) {
      await this.deps.emitEvent({
        id: crypto.randomUUID(), runId, type: "thinking.completed",
        occurredAt: new Date().toISOString(), traceId: ctx.traceId,
        data: { content: thinkingContent, step },
      } as never);
    }

    let source: "api" | "local" = "api";
    if (outputTokens === 0 && modelHasTokens && content) {
      outputTokens = model.countTokens!(content);
      source = "local";
    }

    // P1-F: onAfterModelCall — intercept/modify the response after streaming completes.
    // RV-42: attach the authoritative usage (provider-reported or local fallback).
    const streamedResponse: ModelResponse = {
      content,
      provider: model.provider ?? "unknown",
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
      ...(finishReason ? { finishReason } : {}),
      ...(inputTokens > 0 || outputTokens > 0
        ? { usage: { promptTokens: inputTokens, completionTokens: outputTokens, ...(reasoningTokens > 0 ? { reasoningTokens } : {}) } }
        : {}),
    };
    const afterCallResult = await this.deps.pluginManager?.fireHook("onAfterModelCall", {
      response: streamedResponse as unknown as Record<string, unknown>,
    });
    const effectiveRes = (afterCallResult?.modified?.response ?? streamedResponse) as ModelResponse;

    if (inputTokens > 0 || outputTokens > 0) {
      await this.deps.emitEvent(emitTC(runId, ctx.traceId, { inputTokens, outputTokens, ...(reasoningTokens > 0 ? { reasoningTokens } : {}), ...(cacheReadTokens > 0 ? { cacheReadTokens } : {}), ...(cacheWriteTokens > 0 ? { cacheWriteTokens } : {}), step, source }) as unknown as Omit<KnownRunEvent, "sequence">);
    }

    const durationMs = Math.round(performance.now() - startTime);
    const cost = this.calculateCost(inputTokens, outputTokens, model) ?? 0;
    await this.deps.emitEvent(emitMC(runId, ctx.traceId, { inputTokens, outputTokens, cost, model: modelName, provider: model.provider, durationMs, step }) as unknown as Omit<KnownRunEvent, "sequence">);
    const p = model?.pricing;
    this.deps.logger?.info(`[llm] ${modelName}: ${inputTokens} in, ${outputTokens} out, $${cost.toFixed(6)}, ${durationMs}ms${p ? ` ($${p.input}/${p.output} per 1M)` : ""}`);

      // Emit llm.response with full response snapshot
      if (runId) {
        await this.deps.emitEvent({
          id: crypto.randomUUID(), runId, type: "llm.response" as const,
          occurredAt: new Date().toISOString(), sequence: 0, traceId: ctx.traceId,
          data: {
            step,
            content: effectiveRes.content ?? "",
            toolCalls: effectiveRes.toolCalls,
            finishReason: effectiveRes.finishReason,
            usage: {
              inputTokens,
              outputTokens,
              ...(reasoningTokens > 0 ? { reasoningTokens } : {}),
              ...(cacheReadTokens > 0 ? { cacheReadTokens } : {}),
              ...(cacheWriteTokens > 0 ? { cacheWriteTokens } : {}),
            },
            durationMs,
            model: modelName,
            provider: model.provider,
          },
        } as Omit<KnownRunEvent, "sequence">);
      }

      // RV-42: a hook may have replaced the response without usage — surface the
      // authoritative usage so downstream token budgeting is not a no-op.
      return effectiveRes.usage
        ? effectiveRes
        : inputTokens > 0 || outputTokens > 0
          ? { ...effectiveRes, usage: { promptTokens: inputTokens, completionTokens: outputTokens } }
          : effectiveRes;
  }

  async doThinkingStep(
    messages: ChatMessage[],
    step: number,
    runId: RunId,
    ctx: RequestContext,
    signal: AbortSignal,
  ): Promise<void> {
    await this.deps.emitEvent({
      id: crypto.randomUUID(), runId, type: "thinking.started",
      occurredAt: new Date().toISOString(), traceId: ctx.traceId,
      data: { step },
    } as never);

    let thinking = "";
    const thinkModel = this.getActiveModel(runId);

    if (thinkModel.stream) {
      for await (const event of thinkModel.stream(
        { messages: [...messages, { role: "system" as const, content: this.deps.thinkingPrompt }], tools: [] },
        signal,
      )) {
        if (signal?.aborted) break;
        if (event.type === "text") {
          thinking += event.content;
          await this.deps.emitEvent({
            id: crypto.randomUUID(), runId, type: "thinking.content",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: { content: event.content, step },
          } as never, false);
        } else if (event.type === "error") {
          return;
        }
      }
    } else {
      try {
        const res = await thinkModel.generate(
          { messages: [...messages, { role: "system", content: this.deps.thinkingPrompt }], tools: [], maxTokens: this.deps.thinkingBudget },
          signal,
        );
        thinking = res.content;
        if (thinking) {
          await this.deps.emitEvent({
            id: crypto.randomUUID(), runId, type: "thinking.content",
            occurredAt: new Date().toISOString(), traceId: ctx.traceId,
            data: { content: thinking, step },
          } as never, false);
        }
      } catch {
        return;
      }
    }

    if (thinking.trim()) {
      messages.push({
        role: "system",
        content: `[Thinking from previous pass]\n${thinking.trim()}`,
      });
    }

    await this.deps.emitEvent({
      id: crypto.randomUUID(), runId, type: "thinking.completed",
      occurredAt: new Date().toISOString(), traceId: ctx.traceId,
      data: { content: thinking, step },
    } as never);
  }

  calculateCost(inputTokens: number, outputTokens: number, model?: ModelProvider): number | undefined {
    const p = model?.pricing;
    if (!p) return undefined;
    const inputCost = (inputTokens * p.input) / 1_000_000;
    const outputCost = (outputTokens * p.output) / 1_000_000;
    return Number((inputCost + outputCost).toFixed(6));
  }
}