import type { ConfigFieldMeta } from "./definition.js";
import { CONFIG_GROUPS } from "./definition.js";

export interface JsonSchemaProperty {
  type?: string;
  description?: string;
  default?: unknown;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  items?: JsonSchemaProperty;
  additionalProperties?: JsonSchemaProperty;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  oneOf?: JsonSchemaProperty[];
}

export interface JsonSchemaRoot extends JsonSchemaProperty {
  $schema: string;
  $id?: string;
  title?: string;
}

function fieldToJsonSchema(field: ConfigFieldMeta): JsonSchemaProperty {
  const schema: JsonSchemaProperty = {};

  if (field.description) {
    schema.description = field.description;
  }

  if (field.default !== undefined) {
    schema.default = field.default;
  }

  if (field.children) {
    const properties: Record<string, JsonSchemaProperty> = {};
    const required: string[] = [];

    for (const child of field.children) {
      const childKey = child.key.split(".").pop()!;
      properties[childKey] = fieldToJsonSchema(child);
      if (child.validation?.required) {
        required.push(childKey);
      }
    }

    schema.type = "object";
    schema.properties = properties;
    if (required.length > 0) {
      schema.required = required;
    }
    return schema;
  }

  if (field.recordValue) {
    const valueSchema = fieldToJsonSchema(field.recordValue);
    schema.type = "object";
    schema.additionalProperties = valueSchema;
    return schema;
  }

  if (field.arrayItem) {
    schema.type = "array";
    schema.items = fieldToJsonSchema(field.arrayItem);
    return schema;
  }

  const ctrl = field.control;

  if (ctrl === "code") {
    return schema;
  }

  switch (ctrl) {
    case "text":
    case "password": {
      schema.type = "string";
      if (field.placeholder) schema.default = field.placeholder;
      if (field.validation?.min !== undefined) schema.minLength = field.validation.min;
      if (field.validation?.max !== undefined) schema.maxLength = field.validation.max;
      if (field.validation?.pattern) schema.pattern = field.validation.pattern;
      break;
    }
    case "number": {
      schema.type = "number";
      if (field.validation?.min !== undefined) schema.minimum = field.validation.min;
      if (field.validation?.max !== undefined) schema.maximum = field.validation.max;
      break;
    }
    case "toggle": {
      schema.type = "boolean";
      break;
    }
    case "select": {
      schema.type = "string";
      if (field.options) {
        schema.enum = field.options.map((o) => o.value);
      }
      break;
    }
    case "multi-select": {
      schema.type = "array";
      if (field.options) {
        schema.items = {
          type: "string",
          enum: field.options.map((o) => o.value),
        };
      }
      break;
    }
    case "color":
    case "keybinding": {
      schema.type = "string";
      break;
    }
  }

  return schema;
}

export function buildVntJsonSchema(): JsonSchemaRoot {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const group of CONFIG_GROUPS) {
    for (const field of group.fields) {
      const schema = fieldToJsonSchema(field);
      if (field.description && !schema.description) {
        schema.description = field.description;
      }
      properties[field.key] = schema;
      if (field.validation?.required) {
        required.push(field.key);
      }
    }
  }

  const schema: JsonSchemaRoot = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://vnt.ai/schemas/config.json",
    title: "VNT Agent Configuration",
    description: "Schema for vnt.json configuration file",
    type: "object",
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}
