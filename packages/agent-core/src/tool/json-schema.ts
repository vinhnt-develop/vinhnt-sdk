export interface NestedJsonSchema {
  readonly type: "string" | "number" | "boolean" | "array" | "object";
  readonly description?: string;
  readonly enum?: readonly string[];
  readonly default?: unknown;
  readonly properties?: Record<string, NestedJsonSchema>;
  readonly items?: NestedJsonSchema;
  readonly required?: readonly string[];
}

export interface JsonSchemaProperty {
  readonly type: "string" | "number" | "boolean" | "array" | "object";
  readonly description?: string;
  readonly enum?: readonly string[];
  readonly default?: unknown;
  readonly items?: JsonSchemaProperty;
}

export interface JsonSchema7Object {
  readonly type: "object";
  readonly properties?: Record<string, JsonSchemaProperty>;
  readonly required?: readonly string[];
}
