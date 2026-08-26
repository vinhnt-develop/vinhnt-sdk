/**
 * Token Metering — estimate and track token usage.
 *
 * Provides heuristic token estimation and replay-aware measurement
 * for tracking context pressure and usage across sessions.
 *
 * @example
 * ```ts
 * import { TokenMeter } from "@vinhnt-sdk/llm";
 *
 * const meter = new TokenMeter();
 * const tokens = meter.estimateMessage({ role: "user", content: "Hello world" });
 * // tokens ≈ 4 (2 words + overhead)
 * ```
 */

import type { ModelUsage } from "@vinhnt-sdk/schema";

/** Fixed density: characters per token (heuristic). */
const CHARS_PER_TOKEN = 4;

/** Structural overhead per content block. */
const BLOCK_OVERHEAD = 4;

/** Structural overhead per message. */
const ROLE_OVERHEAD = 4;

/**
 * Token meter — estimates token counts heuristically.
 *
 * Provider-specific tokenizers would be more accurate but would
 * couple the meter to a specific provider. The heuristic is
 * intentionally approximate for budget estimation.
 */
export class TokenMeter {
  /**
   * Heuristically estimate the token count for a message.
   *
   * @param message - The message to estimate
   * @returns Estimated token count
   */
  estimateMessage(message: { readonly role: string; readonly content: string | readonly unknown[] }): number {
    const content = typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);

    const contentTokens = Math.ceil(content.length / CHARS_PER_TOKEN);
    return ROLE_OVERHEAD + contentTokens;
  }

  /**
   * Estimate the token count for a full request.
   *
   * @param messages - The conversation messages
   * @param tools - Optional tool definitions
   * @returns Estimated total tokens
   */
  estimateRequest(
    messages: readonly { readonly role: string; readonly content: string | readonly unknown[] }[],
    tools?: readonly unknown[],
  ): number {
    let total = 0;
    for (const msg of messages) {
      total += this.estimateMessage(msg);
    }
    if (tools) {
      total += tools.length * BLOCK_OVERHEAD;
      for (const tool of tools) {
        total += Math.ceil(JSON.stringify(tool).length / CHARS_PER_TOKEN);
      }
    }
    return total;
  }

  /**
   * Estimate tokens for a text string.
   */
  estimateText(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Measure context pressure — how much of the context window is used.
   *
   * @param usage - The token usage from a model response
   * @param contextLimit - The model's context window
   * @returns Pressure ratio (0-1, where 1 = fully used)
   */
  measurePressure(usage: ModelUsage, contextLimit: number): number {
    const input = usage.promptTokens ?? usage.inputTokens ?? 0;
    return Math.min(1, input / contextLimit);
  }

  /**
   * Project next request token estimate based on current usage.
   *
   * @param currentUsage - Current request usage
   * @param messageGrowth - Expected message growth (default: 0.1 = 10%)
   * @returns Projected input tokens for next request
   */
  projectNextRequest(currentUsage: ModelUsage, messageGrowth = 0.1): number {
    const current = currentUsage.promptTokens ?? currentUsage.inputTokens ?? 0;
    return Math.ceil(current * (1 + messageGrowth));
  }
}
