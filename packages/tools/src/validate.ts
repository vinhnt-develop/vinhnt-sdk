import type { z} from "zod";
import { ZodError } from "zod";
import { ToolInputError as SchemaToolInputError } from "@vinhnt-sdk/schema";

/** Thrown when tool input fails Zod validation. */
export class ToolInputError extends SchemaToolInputError {
  public override readonly code = "TOOL_INPUT_ERROR";
  public override readonly retryable = false;

  constructor(
    public readonly toolId: string,
    issues: z.ZodIssue[],
  ) {
    const details = issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    super(toolId, details);
    this.name = "ToolInputError";
  }
}

/** Validate tool input against a Zod schema, throwing {@link ToolInputError} on failure. */
export function validateInput<T>(toolId: string, schema: z.ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ToolInputError(toolId, err.issues);
    }
    throw err;
  }
}

/** Create a reusable validator bound to a tool id. */
export function createValidator<T>(toolId: string, schema: z.ZodSchema<T>): (input: unknown) => T {
  return (input: unknown) => validateInput(toolId, schema, input);
}
