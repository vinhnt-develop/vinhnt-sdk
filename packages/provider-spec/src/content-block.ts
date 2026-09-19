/**
 * Content block types.
 *
 * Uses discriminated union on `type` field (Anthropic pattern).
 * Every polymorphic content type has a `type` discriminator.
 */

/**
 * Text content block.
 */
export interface TextContentBlock {
  readonly type: "text";
  /** The text content. */
  readonly text: string;
  /** Provider-specific metadata. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Tool use content block (assistant wants to call a tool).
 */
export interface ToolUseContentBlock {
  readonly type: "tool_use";
  /** Tool call ID. */
  readonly id: string;
  /** Tool name. */
  readonly name: string;
  /** Tool input (parsed or raw JSON string). */
  readonly input: Record<string, unknown> | string;
  /** Provider-specific metadata. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Tool result content block (result of a tool call).
 */
export interface ToolResultContentBlock {
  readonly type: "tool_result";
  /** ID of the tool call this is responding to. */
  readonly toolUseId: string;
  /** Tool result content. */
  readonly content: string | ContentBlock[];
  /** Whether the tool call had an error. */
  readonly isError?: boolean;
  /** Provider-specific metadata. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Thinking/reasoning content block.
 */
export interface ThinkingContentBlock {
  readonly type: "thinking";
  /** The thinking content. */
  readonly thinking: string;
  /** Signature for verification (Anthropic). */
  readonly signature?: string;
  /** Provider-specific metadata. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Image content block.
 */
export interface ImageContentBlock {
  readonly type: "image";
  /** Image source. */
  readonly source: {
    readonly type: "base64";
    /** Base64-encoded image data. */
    readonly data: string;
    /** MIME type. */
    readonly mediaType: string;
  } | {
    readonly type: "url";
    /** Image URL. */
    readonly url: string;
  };
  /** Provider-specific metadata. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Union of all content block types.
 *
 * Uses discriminated union pattern for exhaustive type narrowing.
 *
 * @example
 * ```typescript
 * function handleBlock(block: ContentBlock) {
 *   switch (block.type) {
 *     case "text":
 *       return block.text; // TypeScript knows this is TextContentBlock
 *     case "tool_use":
 *       return block.name; // TypeScript knows this is ToolUseContentBlock
 *     case "thinking":
 *       return block.thinking; // TypeScript knows this is ThinkingContentBlock
 *   }
 * }
 * ```
 */
export type ContentBlock =
  | TextContentBlock
  | ToolUseContentBlock
  | ToolResultContentBlock
  | ThinkingContentBlock
  | ImageContentBlock;

/**
 * Type guard for text content blocks.
 */
export function isTextContentBlock(block: ContentBlock): block is TextContentBlock {
  return block.type === "text";
}

/**
 * Type guard for tool use content blocks.
 */
export function isToolUseContentBlock(block: ContentBlock): block is ToolUseContentBlock {
  return block.type === "tool_use";
}

/**
 * Type guard for tool result content blocks.
 */
export function isToolResultContentBlock(block: ContentBlock): block is ToolResultContentBlock {
  return block.type === "tool_result";
}

/**
 * Type guard for thinking content blocks.
 */
export function isThinkingContentBlock(block: ContentBlock): block is ThinkingContentBlock {
  return block.type === "thinking";
}

/**
 * Type guard for image content blocks.
 */
export function isImageContentBlock(block: ContentBlock): block is ImageContentBlock {
  return block.type === "image";
}

/**
 * Extract text from content blocks.
 */
export function extractText(blocks: readonly ContentBlock[]): string {
  return blocks
    .filter(isTextContentBlock)
    .map((b) => b.text)
    .join("");
}

/**
 * Extract tool calls from content blocks.
 */
export function extractToolCalls(blocks: readonly ContentBlock[]): ToolUseContentBlock[] {
  return blocks.filter(isToolUseContentBlock);
}
