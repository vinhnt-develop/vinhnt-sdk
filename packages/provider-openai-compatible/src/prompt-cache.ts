/**
 * Prompt-cache request shaping (P2-9 / G7.1).
 *
 * Two wire strategies, both strictly opt-in:
 *
 * 1. `cache_control` — Anthropic-style `{type:"ephemeral"}` breakpoints that
 *    mark the end of the STABLE prompt prefix (tools → system → history).
 *    Gateways fronting Anthropic models in OpenAI mode honour them; plain
 *    OpenAI endpoints ignore/reject unknown fields — so the default is off.
 *    Anthropic caps breakpoints at 4; this shaper emits at most 3.
 * 2. `prompt_cache_key` — OpenAI's opaque session key for automatic prefix
 *    caching (lets the provider route requests to the same cache bucket).
 *
 * "Prefix ordering": `buildRequest` already serializes the stable parts first
 * (tools definition + system message + chronological history, latest turn
 * last). The `messages` breakpoint defaults to `"before-last"` so the cached
 * prefix ends BEFORE the volatile newest turn — the standard cache layout.
 */

import type { OpenAIMessage } from "@vinhnt-sdk/schema";

/** The Anthropic/gateway ephemeral cache marker. */
export const CACHE_CONTROL_EPHEMERAL = { type: "ephemeral" } as const;

/** Where/how to place `cache_control` breakpoints (mode `"cache_control"`). */
export interface PromptCacheControlOptions {
  /** Annotate the LAST tool definition (tools prefix). Default `true`. */
  readonly tools?: boolean;
  /** Annotate the system message when present. Default `true`. */
  readonly system?: boolean;
  /**
   * Message breakpoint placement: `"last"` annotates the final message,
   * `"before-last"` (default) annotates the message before the newest turn
   * (stable-prefix end), `false` annotates no message.
   */
  readonly messages?: "last" | "before-last" | false;
}

/** Prompt-cache request shaping (P2-9). Default: no shaping at all. */
export type PromptCacheShaping =
  | { readonly mode: "off" }
  | { readonly mode: "cache_control"; readonly options?: PromptCacheControlOptions }
  | {
      readonly mode: "prompt_cache_key";
      /** Opaque key identifying the cache bucket (same key = shared prefix cache). */
      readonly key: string;
      /** Optional retention hint forwarded verbatim (provider support varies). */
      readonly retention?: string;
    };

/** A tool entry eligible for a `cache_control` breakpoint. */
type ToolLike = { readonly cache_control?: { readonly type: "ephemeral" } };

/** Result of applying `cache_control` shaping (immutable copies). */
export interface ShapedPrompt {
  readonly messages: readonly OpenAIMessage[];
  readonly tools?: readonly ToolLike[];
  /** Number of breakpoints placed (Anthropic cap: 4). */
  readonly breakpoints: number;
}

/**
 * Apply `mode: "cache_control"` shaping to the prompt parts.
 * Returns new arrays — inputs are never mutated. Other modes → pass-through.
 */
export function applyPromptCacheShaping(
  messages: readonly OpenAIMessage[],
  tools: readonly ToolLike[] | undefined,
  shaping: PromptCacheShaping | undefined,
): ShapedPrompt {
  if (shaping === undefined || shaping.mode !== "cache_control") {
    return { messages, ...(tools !== undefined ? { tools } : {}), breakpoints: 0 };
  }
  const opts = shaping.options ?? {};
  const annotateTools = opts.tools ?? true;
  const annotateSystem = opts.system ?? true;
  const messageMode = opts.messages ?? "before-last";

  let breakpoints = 0;
  let shapedTools = tools;
  if (annotateTools && tools !== undefined && tools.length > 0) {
    const last = tools.length - 1;
    shapedTools = tools.map((t, i) => (i === last ? { ...t, cache_control: CACHE_CONTROL_EPHEMERAL } : t));
    breakpoints += 1;
  }

  let messageIndex = -1;
  if (messageMode === "last") {
    messageIndex = messages.length - 1;
  } else if (messageMode === "before-last") {
    messageIndex = messages.length - 2;
  }
  let shapedMessages = messages;
  if (messageIndex >= 0) {
    const target = messages[messageIndex];
    if (target !== undefined && target.cache_control === undefined) {
      shapedMessages = messages.map((m, i) => (i === messageIndex ? { ...m, cache_control: CACHE_CONTROL_EPHEMERAL } : m));
      breakpoints += 1;
    }
  }

  if (annotateSystem && shapedMessages.length > 0) {
    const idx = shapedMessages.findIndex((m) => m.role === "system");
    if (idx >= 0 && shapedMessages[idx]?.cache_control === undefined) {
      shapedMessages = shapedMessages.map((m, i) => (i === idx ? { ...m, cache_control: CACHE_CONTROL_EPHEMERAL } : m));
      breakpoints += 1;
    }
  }

  return { messages: shapedMessages, ...(shapedTools !== undefined ? { tools: shapedTools } : {}), breakpoints };
}
