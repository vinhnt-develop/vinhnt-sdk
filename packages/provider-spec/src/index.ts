/**
 * Provider specification for vinhnt-sdk.
 *
 * This package contains pure TypeScript interfaces with ZERO runtime dependencies.
 * Providers implement these interfaces. Core consumes them.
 *
 * Pattern inspired by Vercel AI SDK's `@ai-sdk/provider` package.
 */

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
