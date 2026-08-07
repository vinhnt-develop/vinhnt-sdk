import type { ToolContext } from "../tool/context.js";
import type { ToolDefinition, ToolRisk } from "../tool/definitions.js";
import type { JsonSchema7Object } from "../tool/json-schema.js";

/**
 * FakeTool — Mock tool for unit tests.
 *
 * Usage:
 * ```ts
 * // Tool returns fixed result
 * const tool = new FakeTool("read_file", async (input, ctx) => "content");
 * ```
 */
export class FakeTool implements ToolDefinition {
  readonly id: string;
  readonly description: string;
  readonly risk: ToolRisk;
  readonly inputSchema: JsonSchema7Object | undefined;

  private readonly executeFn: (input: unknown, ctx: ToolContext) => Promise<unknown>;

  constructor(
    id: string,
    executeFn?: (input: unknown, ctx: ToolContext) => Promise<unknown>,
    inputSchema?: JsonSchema7Object | undefined,
    risk?: ToolRisk,
  ) {
    this.id = id;
    this.description = `Fake tool: ${id} — for unit testing`;
    this.risk = risk ?? "read";
    this.inputSchema = inputSchema;
    this.executeFn = executeFn ?? (async (input) => `[FakeTool:${id}] ${JSON.stringify(input)}`);
  }

  async execute(input: unknown, ctx: ToolContext): Promise<unknown> {
    return this.executeFn(input, ctx);
  }
}
