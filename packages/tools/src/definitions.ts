import type { z } from "zod";
import type { ToolDefinitionLike } from "@vinhnt-sdk/schema";
import type { ToolContext } from "./context.js";
export type { ToolContext };
import type { NestedJsonSchema } from "./json-schema.js";

/** Known tool risk levels. Use as reference, not exhaustive. */
export const KNOWN_TOOL_RISKS = ["read", "write", "destructive", "external"] as const;

/** Tool risk level — open string for extensibility. */
export type ToolRisk = string;

export interface ToolDefinition<TInput = unknown, TOutput = unknown> extends ToolDefinitionLike {
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
