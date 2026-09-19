/**
 * Tool specification types.
 *
 * Tools are the primary way agents interact with the outside world.
 * This defines the contract for tool definitions and execution.
 */

/**
 * Context passed to tool execution.
 */
export interface ToolContext<TContext = unknown> {
  /** The run context from the agent. */
  readonly runContext: TContext;
  /** Abort signal for cancellation. */
  readonly abortSignal?: AbortSignal;
  /** Tool call ID. */
  readonly toolCallId: string;
  /** Tool name. */
  readonly toolName: string;
}

/**
 * Function to execute a tool.
 */
export type ToolExecuteFunction<TInput = unknown, TOutput = unknown, TContext = unknown> = (
  input: TInput,
  context: ToolContext<TContext>,
) => Promise<TOutput> | TOutput;

/**
 * A tool that can be called by the agent.
 *
 * Tools use discriminated union on `type` field (Anthropic pattern).
 */
export type Tool<TInput = unknown, TOutput = unknown, TContext = unknown> =
  | FunctionTool<TInput, TOutput, TContext>
  | DynamicTool<TInput, TOutput, TContext>;

/**
 * A user-defined function tool with type-safe input/output.
 */
export interface FunctionTool<TInput = unknown, TOutput = unknown, TContext = unknown> {
  /** Tool type discriminator. */
  readonly type: "function";
  /** Unique tool name. */
  readonly name: string;
  /** Description shown to the LLM. */
  readonly description: string;
  /** JSON Schema for input validation. */
  readonly inputSchema: Record<string, unknown>;
  /** JSON Schema for output validation (optional). */
  readonly outputSchema?: Record<string, unknown>;
  /** Execute the tool. */
  readonly execute: ToolExecuteFunction<TInput, TOutput, TContext>;
  /** Risk level for permission checking. */
  readonly riskLevel?: "none" | "read" | "write" | "destructive" | "external";
  /** Whether this tool is enabled. */
  readonly isEnabled?: boolean | ((context: TContext) => boolean | Promise<boolean>);
  /** Whether this tool requires approval. */
  readonly requiresApproval?: boolean | ((input: TInput, context: TContext) => boolean | Promise<boolean>);
  /** Timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** Provider-specific metadata. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * A tool defined at runtime with unknown types.
 */
export interface DynamicTool<TInput = unknown, TOutput = unknown, TContext = unknown> {
  /** Tool type discriminator. */
  readonly type: "dynamic";
  /** Unique tool name. */
  readonly name: string;
  /** Description shown to the LLM. */
  readonly description: string;
  /** JSON Schema for input validation. */
  readonly inputSchema: Record<string, unknown>;
  /** Execute the tool. */
  readonly execute: ToolExecuteFunction<TInput, TOutput, TContext>;
  /** Risk level for permission checking. */
  readonly riskLevel?: "none" | "read" | "write" | "destructive" | "external";
  /** Whether this tool is enabled. */
  readonly isEnabled?: boolean | ((context: TContext) => boolean | Promise<boolean>);
  /** Timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** Provider-specific metadata. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Helper to create a type-safe tool (type-level identity function).
 *
 * @example
 * ```typescript
 * const weatherTool = tool({
 *   name: "get_weather",
 *   description: "Get weather for a location",
 *   inputSchema: { type: "object", properties: { location: { type: "string" } } },
 *   execute: async (input) => fetchWeather(input.location),
 * });
 * ```
 */
export function tool<TInput, TOutput, TContext = unknown>(
  t: FunctionTool<TInput, TOutput, TContext>,
): FunctionTool<TInput, TOutput, TContext> {
  return t;
}
