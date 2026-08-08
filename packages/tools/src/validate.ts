import { z, ZodError } from "zod";
import { VntError } from "@vinhnt-sdk/schema";

export class ToolInputError extends VntError {
  constructor(
    public readonly toolId: string,
    issues: z.ZodIssue[],
  ) {
    const details = issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    super(`Validation failed for tool "${toolId}": ${details}`);
    this.name = "ToolInputError";
  }
}

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

export function createValidator<T>(toolId: string, schema: z.ZodSchema<T>): (input: unknown) => T {
  return (input: unknown) => validateInput(toolId, schema, input);
}
