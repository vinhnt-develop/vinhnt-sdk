/** Nested JSON Schema shape used to describe tool inputs. */
export interface NestedJsonSchema {
  readonly type: "string" | "number" | "boolean" | "array" | "object";
  readonly description?: string;
  readonly enum?: readonly string[];
  readonly default?: unknown;
  readonly properties?: Record<string, NestedJsonSchema>;
  readonly items?: NestedJsonSchema;
  readonly required?: readonly string[];
}

/** A single property within a {@link JsonSchema7Object}. */
export interface JsonSchemaProperty {
  readonly type: "string" | "number" | "boolean" | "array" | "object";
  readonly description?: string;
  readonly enum?: readonly string[];
  readonly default?: unknown;
  readonly items?: JsonSchemaProperty;
}

/** Minimal JSON Schema 7 object for tool input validation. */
export interface JsonSchema7Object {
  readonly type: "object";
  readonly properties?: Record<string, JsonSchemaProperty>;
  readonly required?: readonly string[];
}
