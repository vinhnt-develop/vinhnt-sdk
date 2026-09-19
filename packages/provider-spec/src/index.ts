/**
 * Provider specification for vinhnt-sdk.
 *
 * This package contains pure TypeScript interfaces with ZERO runtime dependencies.
 * Providers implement these interfaces. Core consumes them.
 *
 * Pattern inspired by Vercel AI SDK's `@ai-sdk/provider` package.
 */

import type { LanguageModelV1 } from "./language-model.js";
export type { LanguageModelV1, LanguageModelV1CallOptions, LanguageModelV1GenerateResult, LanguageModelV1StreamResult, LanguageModelStreamPart, FinishReason } from "./language-model.js";
export type { ProviderV1 } from "./provider.js";
export type { LanguageModelUsage, RunUsage, UsageAggregator } from "./usage.js";
export { addRunUsage } from "./usage.js";
export type { Tool, FunctionTool, DynamicTool, ToolContext, ToolExecuteFunction } from "./tool.js";
export { tool } from "./tool.js";
export type { ChatMessage, SystemMessage, UserMessage, AssistantMessage, ToolMessage, DeveloperMessage, ContentPart, ToolCallPart } from "./message.js";
export { isSystemMessage, isUserMessage, isAssistantMessage, isToolMessage, isDeveloperMessage } from "./message.js";
export type { ContentBlock, TextContentBlock, ToolUseContentBlock, ToolResultContentBlock, ThinkingContentBlock, ImageContentBlock } from "./content-block.js";
export { isTextContentBlock, isToolUseContentBlock, isToolResultContentBlock, isThinkingContentBlock, isImageContentBlock, extractText, extractToolCalls } from "./content-block.js";
export type { SdkError, ErrorDomain, ErrorCategory, LlmError, ToolError, ValidationError, ConfigError } from "./errors.js";
export { SdkError as SdkErrorClass, LlmError as LlmErrorClass, ToolError as ToolErrorClass, ValidationError as ValidationErrorClass, ConfigError as ConfigErrorClass } from "./errors.js";

/**
 * Allow static OR per-request dynamic values.
 *
 * Inspired by Mastra's `DynamicArgument` pattern.
 *
 * @example
 * ```typescript
 * // Static value
 * const agent = new Agent({ maxSteps: 10 });
 *
 * // Dynamic value (resolved per request)
 * const agent = new Agent({
 *   instructions: (ctx) => `User is ${ctx.user.name}`,
 * });
 * ```
 */
export type DynamicArgument<T, TContext = unknown> =
  | T
  | ((ctx: TContext) => T | Promise<T>);

/**
 * Resolve a DynamicArgument to its static value.
 */
export function resolveDynamicArgument<T, TContext = unknown>(
  arg: DynamicArgument<T, TContext>,
  context: TContext,
): T | Promise<T> {
  return typeof arg === "function" ? (arg as (ctx: TContext) => T | Promise<T>)(context) : arg;
}

/**
 * Global run configuration.
 *
 * Applied to all agents unless overridden by AgentConfig.
 */
export interface RunConfig {
  /** Model to use for all agents. */
  readonly model?: string | LanguageModelV1;
  /** Maximum steps per run. */
  readonly maxSteps?: number;
  /** Temperature (0-2). */
  readonly temperature?: number;
  /** Maximum output tokens. */
  readonly maxOutputTokens?: number;
  /** Abort signal for cancellation. */
  readonly abortSignal?: AbortSignal;
  /** Telemetry configuration. */
  readonly telemetry?: {
    readonly isEnabled?: boolean;
    readonly functionId?: string;
  };
}
