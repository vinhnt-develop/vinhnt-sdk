import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolRisk } from "./definitions.js";
import type { NestedJsonSchema } from "./json-schema.js";
import { validateInput } from "./validate.js";

/**
 * ── Schema-first tool authoring (OpenCode-style `Tool.make`) ──────────────
 * The tool OWNS its validation schema (`input`) instead of importing a
 * standalone static schema. `toDefinition()` derives the provider-facing
 * `ToolDefinition` (JSON Schema) from that schema, so there is exactly one
 * source of truth per tool. Domain namespacing is applied via `name`.
 */

export interface ToolConfig<TInput = unknown, TOutput = unknown> {
  /** Tool name / id. Use dot-prefixed names for domains: "coding.read_file". */
  name: string;
  description: string;
  risk: ToolRisk;
  /** Runtime validation schema — owned by this tool, not a shared file. */
  input: z.ZodType<TInput>;
  /** Optional output validation schema. */
  output?: z.ZodType<TOutput>;
  /** Per-tool timeout in ms (overrides global default). */
  timeoutMs?: number;
  /** Permission action key for the gate (e.g. "edit", "shell"). Optional; defaults to risk. */
  permissionAction?: string;
  /** Optional LLM-facing JSON Schema override (e.g. to advertise `path` aliases). */
  jsonSchema?: NestedJsonSchema;
  /** Coerce raw model-agnostic input before validation (e.g. snake_case aliases). */
  normalize?(raw: unknown): unknown;
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly risk: ToolRisk;
  readonly timeoutMs?: number;
  readonly permissionAction?: string;
  readonly input: z.ZodType<TInput>;
  /** Derive the provider-facing ToolDefinition (registers as `name`). */
  toDefinition(): ToolDefinition<TInput, TOutput>;
}

type ZodLike = any;

/** Map a Zod schema to the codebase's `NestedJsonSchema` shape (best effort). */
export function zodSchemaToNestedJsonSchema(schema: z.ZodTypeAny): NestedJsonSchema | undefined {
  if (!schema) return undefined;
  const out = convert(schema as ZodLike);
  return out ? (Object.assign({}, out) as NestedJsonSchema) : undefined;
}

// Internal mutable shape for building the derived JSON Schema.
type MutableSchema = { -readonly [K in keyof NestedJsonSchema]-?: NestedJsonSchema[K] } & Record<string, any>;

function convert(schema: ZodLike): MutableSchema | undefined {
  if (!schema) return undefined;

  // Unwrap effects (refine/transform) and optional/default wrappers.
  while (schema._def.type === "effects" || schema._def.type === "optional" || schema._def.type === "default") {
    if (schema._def.type === "effects") schema = schema._def.schema as ZodLike;
    else schema = schema._def.innerType as ZodLike;
  }

  const base: MutableSchema = {} as MutableSchema;
  const desc = schema.description ?? schema._def.description;
  if (desc) base.description = desc;

  switch (schema._def.type) {
    case "string":
      base.type = "string";
      return base;
    case "number":
      base.type = "number";
      return base;
    case "boolean":
      base.type = "boolean";
      return base;
    case "enum": {
      const entries = schema._def.entries ?? {};
      base.type = "string";
      base.enum = Object.keys(entries);
      return base;
    }
    case "literal":
      base.type = typeof schema._def.value === "string" ? "string" : "number";
      return base;
    case "array": {
      base.type = "array";
      base.items = convert(schema._def.innerType as ZodLike) ?? { type: "string" };
      return base;
    }
    case "record":
      base.type = "object";
      return base;
    case "object": {
      base.type = "object";
      const raw = schema._def.shape;
      const shape: Record<string, any> = typeof raw === "function" ? raw() : (raw ?? {});
      const properties: Record<string, NestedJsonSchema> = {};
      const required: string[] = [];
      for (const [key, child] of Object.entries(shape)) {
        properties[key] = convert(child as ZodLike) ?? { type: "string" };
        if (!child.isOptional?.() && child._def?.type !== "optional" && child._def?.type !== "default") {
          required.push(key);
        }
      }
      base.properties = properties;
      if (required.length) base.required = required;
      return base;
    }
    case "union": {
      const options = schema._def.options ?? [];
      if (options.every((o: ZodLike) => o._def?.type === "string")) {
        base.type = "string";
        return base;
      }
      if (options.every((o: ZodLike) => o._def?.type === "number")) {
        base.type = "number";
        return base;
      }
      base.type = "string";
      return base;
    }
    default:
      base.type = "string";
      return base;
  }
}

export function defineTool<TInput = unknown, TOutput = unknown>(
  config: ToolConfig<TInput, TOutput>,
): Tool<TInput, TOutput> {
  return {
    name: config.name,
    description: config.description,
    risk: config.risk,
    timeoutMs: config.timeoutMs,
    permissionAction: config.permissionAction,
    input: config.input,
    toDefinition(): ToolDefinition<TInput, TOutput> {
      return {
        id: config.name,
        description: config.description,
        risk: config.risk,
        inputSchema: config.jsonSchema ?? zodSchemaToNestedJsonSchema(config.input),
        timeoutMs: config.timeoutMs,
        permissionAction: config.permissionAction,
        inputZodSchema: config.input,
        outputZodSchema: config.output,
        async execute(raw: unknown, ctx: ToolContext): Promise<TOutput> {
          const normalized = config.normalize ? config.normalize(raw) : raw;
          const input = validateInput<TInput>(config.name, config.input, normalized);
          const result = await config.execute(input, ctx);
          if (config.output) {
            return validateInput<TOutput>(config.name, config.output, result);
          }
          return result;
        },
      };
    },
  };
}

/** Convenience: build a ToolDefinition directly from a ToolConfig. */
export function toolToDefinition<TInput = unknown, TOutput = unknown>(
  config: ToolConfig<TInput, TOutput>,
): ToolDefinition<TInput, TOutput> {
  return defineTool(config).toDefinition();
}