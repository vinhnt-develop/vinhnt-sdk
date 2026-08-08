import type { z } from "zod";
import type { ToolContext } from "./context.js";
export type { ToolContext };
import type { NestedJsonSchema } from "./json-schema.js";

export type ToolRisk = "read" | "write" | "destructive" | "external";

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly description: string;
  /** JSON Schema for LLM-facing input generation */
  readonly inputSchema?: NestedJsonSchema | undefined;
  readonly risk: ToolRisk;
  /** Per-tool timeout in ms (overrides global default). */
  readonly timeoutMs?: number;
  /** Permission action key for the gate (e.g. "edit", "shell"). Optional; defaults to risk. */
  readonly permissionAction?: string;
  /** Zod schema for runtime input validation (carried from defineTool). */
  readonly inputZodSchema?: z.ZodType<TInput>;
  /** Zod schema for runtime output validation (carried from defineTool). */
  readonly outputZodSchema?: z.ZodType<TOutput>;
  /** If true, tool is not loaded into context until explicitly requested via search. */
  readonly deferred?: boolean;
  /** Tags for tool search (e.g. ["file", "read", "search"]). */
  readonly tags?: readonly string[];
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>;
}
