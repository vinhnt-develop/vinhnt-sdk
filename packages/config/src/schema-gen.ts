import { z, type ZodTypeAny } from "zod";
import { CONFIG_GROUPS, type ConfigFieldMeta } from "./definition.js";

function fieldToZod(field: ConfigFieldMeta): ZodTypeAny {
  const { control, default: defVal, validation, options } = field;

  let schema: ZodTypeAny;

  if (field.children && field.children.length > 0) {
    const shape: Record<string, ZodTypeAny> = {};
    for (const child of field.children) {
      const childKey = child.key.split(".").pop()!;
      shape[childKey] = fieldToZod(child);
    }
    schema = z.object(shape);
    if (validation?.fallback !== undefined) {
      schema = schema.catch(validation.fallback as never);
    }
    if (defVal !== undefined && typeof defVal === "object" && !Array.isArray(defVal)) {
      schema = schema.default(defVal as never);
    }
    if (validation?.optional) {
      schema = schema.optional();
    }
    return schema;
  }

  if (field.recordValue) {
    const valueSchema = fieldToZod(field.recordValue);
    schema = z.record(z.string(), valueSchema);
    if (validation?.fallback !== undefined) {
      schema = schema.catch(validation.fallback as never);
    }
    if (defVal !== undefined) {
      schema = schema.default(defVal as never);
    }
    if (validation?.optional) {
      schema = schema.optional();
    }
    return schema;
  }

  if (field.arrayItem) {
    const itemSchema = fieldToZod(field.arrayItem);
    schema = z.array(itemSchema);
    if (defVal !== undefined) {
      schema = schema.default(defVal as never);
    }
    if (validation?.fallback !== undefined) {
      schema = schema.catch(validation.fallback as never);
    }
    if (validation?.optional) {
      schema = schema.optional();
    }
    return schema;
  }

  switch (control) {
    case "text":
    case "password":
    case "color":
    case "keybinding": {
      let str = z.string();
      if (validation?.pattern) {
        try { str = str.regex(new RegExp(validation.pattern)); }
        catch { console.warn(`Invalid regex pattern in config definition: "${validation.pattern}"`); }
      }
      if (validation?.min !== undefined) str = str.min(validation.min);
      if (validation?.max !== undefined) str = str.max(validation.max);
      schema = str;
      break;
    }
    case "number": {
      let num = z.number();
      if (validation?.min !== undefined) num = num.min(validation.min);
      if (validation?.max !== undefined) num = num.max(validation.max);
      if (validation?.integer) num = num.int();
      schema = num;
      break;
    }
    case "toggle": {
      schema = z.boolean();
      break;
    }
    case "select": {
      const vals = (options ?? []).map((o) => o.value);
      schema = vals.length > 0
        ? z.enum(vals as [string, ...string[]])
        : z.string();
      if (validation?.fallback !== undefined) {
        schema = schema.catch(validation.fallback as never);
      } else if (vals.length > 0) {
        // A single bad value must not fail the whole config parse — fall back
        // to the first option (mirrors the multi-select/object behavior).
        schema = schema.catch(vals[0] as never);
      } else {
        schema = schema.catch("" as never);
      }
      break;
    }
    case "multi-select": {
      const vals = (options ?? []).map((o) => o.value);
      schema = vals.length > 0
        ? z.array(z.enum(vals as [string, ...string[]]))
        : z.array(z.string());
      if (validation?.fallback !== undefined) {
        schema = schema.catch(validation.fallback as never);
      } else {
        // Bad elements are dropped rather than failing the whole parse.
        schema = schema.catch([] as never);
      }
      break;
    }
    case "code": {
      schema = z.unknown();
      if (validation?.fallback !== undefined) {
        schema = schema.catch(validation.fallback as never);
      }
      break;
    }
    default: {
      schema = z.unknown();
      if (validation?.fallback !== undefined) {
        schema = schema.catch(validation.fallback as never);
      }
    }
  }

  if (defVal !== undefined) {
    schema = schema.default(defVal as never);
  }

  if (validation?.optional) {
    schema = schema.optional();
  }

  return schema;
}

export function buildVntConfigSchema(): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const group of CONFIG_GROUPS) {
    for (const field of group.fields) {
      shape[field.key] = fieldToZod(field);
    }
  }

  return z.object(shape);
}

export function flattenDefinition(): ConfigFieldMeta[] {
  const all: ConfigFieldMeta[] = [];
  function walk(fields: ConfigFieldMeta[]) {
    for (const f of fields) {
      all.push(f);
      if (f.children) walk(f.children);
    }
  }
  for (const g of CONFIG_GROUPS) walk(g.fields);
  return all;
}

export function getGroupById(id: string): typeof CONFIG_GROUPS[number] | undefined {
  return CONFIG_GROUPS.find((g) => g.id === id);
}
