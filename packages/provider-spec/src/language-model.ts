/**
 * Language Model V1 Specification.
 *
 * This is the core interface that all LLM providers must implement.
 * Inspired by Vercel AI SDK's LanguageModelV4 pattern.
 */

import type { ChatMessage } from "./message.js";
import type { Tool } from "./tool.js";
import type { LanguageModelUsage } from "./usage.js";

/**
 * Specification version for forward compatibility.
 */
export const LANGUAGE_MODEL_V1_SPECIFICATION_VERSION = "v1" as const;

/**
 * Options for a language model call.
 */
export interface LanguageModelV1CallOptions {
  /** The prompt messages. */
  readonly messages: readonly ChatMessage[];
  /** The model ID to use. */
  readonly model: string;
  /** The provider ID. */
  readonly provider: string;
  /** Tools available for the model to call. */
  readonly tools?: readonly Tool[];
  /** Tool choice strategy. */
  readonly toolChoice?: "auto" | "none" | "required" | { type: "tool"; toolName: string };
  /** Temperature (0-2). */
  readonly temperature?: number;
  /** Maximum output tokens. */
  readonly maxOutputTokens?: number;
  /** Top-p sampling. */
  readonly topP?: number;
  /** Stop sequences. */
  readonly stopSequences?: string[];
  /** Frequency penalty. */
  readonly frequencyPenalty?: number;
  /** Presence penalty. */
  readonly presencePenalty?: number;
  /** Random seed for reproducibility. */
  readonly seed?: number;
  /** Abort signal for cancellation. */
  readonly abortSignal?: AbortSignal;
  /** Provider-specific options. */
  readonly providerOptions?: Record<string, unknown>;
}

/**
 * Result of a non-streaming language model call.
 */
export interface LanguageModelV1GenerateResult {
  /** The generated content blocks. */
  readonly content: readonly ContentBlock[];
  /** The finish reason. */
  readonly finishReason: FinishReason;
  /** Token usage. */
  readonly usage: LanguageModelUsage;
  /** Warnings from the model. */
  readonly warnings?: readonly string[];
  /** Provider-specific metadata. */
  readonly providerMetadata?: Record<string, unknown>;
}

/**
 * Result of a streaming language model call.
 */
export interface LanguageModelV1StreamResult {
  /** The stream of content blocks. */
  readonly stream: AsyncIterable<LanguageModelStreamPart>;
  /** Provider-specific metadata. */
  readonly providerMetadata?: Record<string, unknown>;
}

/**
 * A part of a language model stream.
 */
export type LanguageModelStreamPart =
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  | { type: "tool-call-start"; id: string; toolName: string }
  | { type: "tool-call-delta"; id: string; argsTextDelta: string }
  | { type: "tool-call-end"; id: string }
  | { type: "reasoning-start"; id: string }
  | { type: "reasoning-delta"; id: string; delta: string }
  | { type: "reasoning-end"; id: string }
  | { type: "finish"; finishReason: FinishReason; usage: LanguageModelUsage }
  | { type: "error"; error: Error };

/**
 * Finish reason from the model.
 */
export type FinishReason =
  | { unified: "stop"; raw: string | undefined }
  | { unified: "length"; raw: string | undefined }
  | { unified: "tool-calls"; raw: string | undefined }
  | { unified: "content-filter"; raw: string | undefined }
  | { unified: "other"; raw: string | undefined };

/**
 * Language model interface that providers must implement.
 */
export interface LanguageModelV1 {
  /** Specification version. */
  readonly specificationVersion: typeof LANGUAGE_MODEL_V1_SPECIFICATION_VERSION;
  /** Provider identifier. */
  readonly provider: string;
  /** Model identifier. */
  readonly modelId: string;
  /** Supported URL patterns for download. */
  readonly supportedUrls?: Promise<Record<string, RegExp[]>>;

  /**
   * Generate a complete response (non-streaming).
   */
  doGenerate(options: LanguageModelV1CallOptions): Promise<LanguageModelV1GenerateResult>;

  /**
   * Generate a streaming response.
   */
  doStream(options: LanguageModelV1CallOptions): Promise<LanguageModelV1StreamResult>;
}

// Re-export ContentBlock for convenience
import type { ContentBlock } from "./content-block.js";
