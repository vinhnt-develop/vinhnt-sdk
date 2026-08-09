import type { RunId, RequestContext, KnownRunEvent } from "@vinhnt-sdk/schema";
import type { ChatMessage, ModelProvider, ModelRequest, ModelResponse, ModelRegistry } from "../model.js";
import type { ToolDefinition } from "@vinhnt-sdk/tools";
import type { PluginManager } from "../plugin.js";

export interface ModelCallerDeps {
  defaultModel: ModelProvider;
  readonly modelRegistry: ModelRegistry | undefined;
  maxTokens: number;
  thinkingBudget: number;
  thinkingPrompt: string;
  readonly pluginManager: PluginManager | undefined;
  emitEvent(event: Omit<KnownRunEvent, "sequence">, persist?: boolean): Promise<void>;
  modelForRun(runId: RunId): ModelProvider | undefined;
  setModelForRun(runId: RunId, model: ModelProvider): void;
  getAvailableTools(): readonly ToolDefinition[];
}

type TypedEvent<Type extends string, Data> = {
  id: string; runId: RunId; type: Type; occurredAt: string; traceId: string; data: Data;
};

function emitTC(runId: RunId, traceId: string, data: {
  inputTokens: number; outputTokens?: number; step: number; source?: "local" | "api";
}): TypedEvent<"token.counted", typeof data> {
  return { id: crypto.randomUUID(), runId, type: "token.counted", occurredAt: new Date().toISOString(), traceId, data };
}

function emitMC(runId: RunId, traceId: string, data: {
  inputTokens: number; outputTokens: number; cost: number; model: string; durationMs: number; step: number;
}): TypedEvent<"model.cost", typeof data> {
  return { id: crypto.randomUUID(), runId, type: "model.cost", occurredAt: new Date().toISOString(), traceId, data };
}

export class ModelCaller {
  constructor(private readonly deps: ModelCallerDeps) {}

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
  ): Promise<ModelResponse> {
    const availableTools = disableTools ? [] : this.deps.getAvailableTools();
    const thinkingBudget = this.deps.thinkingBudget > 0 ? this.deps.thinkingBudget : undefined;
    let request: ModelRequest = {
      messages, tools: availableTools, maxTokens: agentMaxTokens ?? this.deps.maxTokens,
      ...(thinkingBudget !== undefined ? { thinkingBudget } : {}),
      ...(this.deps.thinkingPrompt ? { thinkingPrompt: this.deps.thinkingPrompt } : {}),
    };

    const chatParamsResult = await this.deps.pluginManager?.fireHook("onChatParams", {
      request: request as unknown as Record<string, unknown>,
    });
    if (chatParamsResult?.modified?.request) {
      request = chatParamsResult.modified.request as unknown as ModelRequest;
    }

    const model = this.getActiveModel(runId);
    const modelName = model.model ?? "unknown";
    const startTime = performance.now();
    let inputTokens = 0;
    let outputTokens = 0;

    const modelHasTokens = !!model.countTokens;
    if (modelHasTokens) {
      inputTokens = messages.reduce((sum, m) => sum + model.countTokens!(m.content), 0);
      await this.deps.emitEvent(emitTC(runId, ctx.traceId, { inputTokens, step, source: "local" }) as unknown as Omit<KnownRunEvent, "sequence">);
    }

    let content = "";
    const toolCalls: { id: string; name: string; args: unknown }[] = [];

    if (!model.stream) {
      const res = await model.generate(request, signal);
      let source: "api" | "local" = "api";
      if (res.usage && res.usage.inputTokens > 0 && res.usage.outputTokens > 0) {
        inputTokens = res.usage.inputTokens;
        outputTokens = res.usage.outputTokens;
      } else if (modelHasTokens && res.content) {
        const localOut = model.countTokens!(res.content);
        if (res.usage?.inputTokens) inputTokens = res.usage.inputTokens;
        outputTokens = localOut;
        source = localOut === (res.usage?.outputTokens ?? -1) ? "api" : "local";
      }
      await this.deps.emitEvent(emitTC(runId, ctx.traceId, { inputTokens, outputTokens, step, source }) as unknown as Omit<KnownRunEvent, "sequence">);
      const durationMs = Math.round(performance.now() - startTime);
      const cost = this.calculateCost(inputTokens, outputTokens, model) ?? 0;
      await this.deps.emitEvent(emitMC(runId, ctx.traceId, { inputTokens, outputTokens, cost, model: modelName, durationMs, step }) as unknown as Omit<KnownRunEvent, "sequence">);
      const p = model?.pricing;
      this.deps.logger?.info(`[llm] ${modelName}: ${inputTokens} in, ${outputTokens} out, $${cost.toFixed(6)}, ${durationMs}ms${p ? ` ($${p.input}/${p.output} per 1M)` : ""}`);
      return res;
    }

    for await (const event of model.stream(request, signal)) {
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
        case "tool_call":
          toolCalls.push({ id: event.id, name: event.name, args: event.args });
          break;
        case "usage":
          inputTokens = event.inputTokens;
          outputTokens = event.outputTokens;
          break;
        case "done":
          break;
        case "error":
          throw new Error(event.error);
      }
    }

    let source: "api" | "local" = "api";
    if (outputTokens === 0 && modelHasTokens && content) {
      outputTokens = model.countTokens!(content);
      source = "local";
    }
    if (inputTokens > 0 || outputTokens > 0) {
      await this.deps.emitEvent(emitTC(runId, ctx.traceId, { inputTokens, outputTokens, step, source }) as unknown as Omit<KnownRunEvent, "sequence">);
    }

    const durationMs = Math.round(performance.now() - startTime);
    const cost = this.calculateCost(inputTokens, outputTokens, model) ?? 0;
    await this.deps.emitEvent(emitMC(runId, ctx.traceId, { inputTokens, outputTokens, cost, model: modelName, durationMs, step }) as unknown as Omit<KnownRunEvent, "sequence">);
    const p = model?.pricing;
    this.deps.logger?.info(`[llm] ${modelName}: ${inputTokens} in, ${outputTokens} out, $${cost.toFixed(6)}, ${durationMs}ms${p ? ` ($${p.input}/${p.output} per 1M)` : ""}`);

    return toolCalls.length > 0 ? { content, toolCalls } : { content };
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
