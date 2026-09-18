import type { z } from "zod";
import type { ToolDefinitionLike } from "@vinhnt-sdk/schema";
import type { ToolContext } from "./context.js";
export type { ToolContext };
import type { NestedJsonSchema } from "./json-schema.js";

/** Known tool risk levels. Use as reference, not exhaustive. */
export const KNOWN_TOOL_RISKS = ["read", "write", "destructive", "external"] as const;

/** Tool risk level — open string for extensibility. */
export type ToolRisk = string;

/** Tool annotations — hint about tool behavior for LLMs (MCP 2026-07-28 pattern) */
export interface ToolAnnotations {
  /** If true, tool does not modify its environment */
  readonly readOnlyHint?: boolean;
  /** If true, tool may perform destructive actions (delete, overwrite) */
  readonly destructiveHint?: boolean;
  /** If true, tool performs network access */
  readonly openWorldHint?: boolean;
  /** If true, tool requires human approval before execution */
  readonly requiresApproval?: boolean;
}

/** Provider-facing tool definition: schema, risk and execute. */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> extends ToolDefinitionLike {
  readonly inputSchema?: NestedJsonSchema | undefined;
  /** JSON Schema for tool output (MCP 2026-07-28 pattern) */
  readonly outputSchema?: NestedJsonSchema | undefined;
  readonly risk: ToolRisk;
  /** Per-tool timeout in ms (overrides global default). */
  readonly timeoutMs?: number;
  /** Permission action key for the gate (e.g. "edit", "shell"). Optional; defaults to risk. */
  readonly permissionAction?: string;
  /**
   * If true, the tool prompts its own permission dialog via `ctx.ask` during
   * execute (with `savePatterns`). The kernel gate must NOT double-approve —
   * it defers to the tool's single ask and only checks allow/deny rules.
   */
  readonly selfApproving?: boolean;
  /** Zod schema for runtime input validation (carried from defineTool). */
  readonly inputZodSchema?: z.ZodType<TInput>;
  /** Zod schema for runtime output validation (carried from defineTool). */
  readonly outputZodSchema?: z.ZodType<TOutput>;
  /** If true, tool is not loaded into context until explicitly requested via search. */
  readonly deferred?: boolean;
  /** Tags for tool search (e.g. ["file", "read", "search"]). */
  readonly tags?: readonly string[];
  /** Tool annotations — hints about tool behavior for LLMs */
  readonly annotations?: ToolAnnotations;
  /** Icon identifier or emoji for UI display */
  readonly icon?: string;
  /** Human-readable category for tool grouping */
  readonly category?: string;
  readonly metadata?: Record<string, unknown>;
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>;
}
