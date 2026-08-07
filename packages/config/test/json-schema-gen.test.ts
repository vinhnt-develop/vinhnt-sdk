import { describe, expect, it } from "vitest";
import { buildVntJsonSchema } from "../src/json-schema-gen.js";

describe("buildVntJsonSchema", () => {
  const schema = buildVntJsonSchema();
  const props = schema.properties as Record<string, unknown>;

  it("returns root schema with $schema and $id", () => {
    expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
    expect(schema.$id).toBe("https://vnt.ai/schemas/config.json");
    expect(schema.title).toBe("VNT Agent Configuration");
    expect(schema.type).toBe("object");
  });

  it("includes flat field keys as root properties", () => {
    expect(props["defaultProvider"]).toBeDefined();
    expect(props["providers"]).toBeDefined();
    expect(props["mcpServers"]).toBeDefined();
    expect(props["auto"]).toBeDefined();
    expect(props["logLevel"]).toBeDefined();
    expect(props["learning"]).toBeDefined();
    expect(props["compaction"]).toBeDefined();
    expect(props["experimental"]).toBeDefined();
  });

  it("maps defaultProvider as free-form string (allows custom providers)", () => {
    const dp = props["defaultProvider"] as { type?: string; enum?: string[] };
    expect(dp.type).toBe("string");
    expect(dp.enum).toBeUndefined();
  });

  it("maps toggle fields as boolean type", () => {
    const auto = props["auto"] as { type?: string };
    expect(auto.type).toBe("boolean");
  });

  it("maps number fields with min/max constraints", () => {
    const maxTokens = props["maxTokens"] as { type?: string; minimum?: number; maximum?: number };
    expect(maxTokens.type).toBe("number");
    expect(maxTokens.minimum).toBe(1);
    expect(maxTokens.maximum).toBe(128000);
  });

  it("has code type fields as untyped (any) schema", () => {
    const permission = props["permission"] as { type?: string };
    expect(permission.type).toBeUndefined();
  });

  it("compaction field is object with children properties", () => {
    const compaction = props["compaction"] as { type?: string; properties?: Record<string, unknown> };
    expect(compaction.type).toBe("object");
    expect(compaction.properties).toBeDefined();
    expect(compaction.properties?.["strategy"]).toBeDefined();
    expect(compaction.properties?.["headCount"]).toBeDefined();
  });

  it("providers record value maps to additionalProperties", () => {
    const providers = props["providers"] as { type?: string; additionalProperties?: unknown };
    expect(providers.type).toBe("object");
    expect(providers.additionalProperties).toBeDefined();
  });

  it("does not include required array when no required fields", () => {
    expect(schema.required).toBeUndefined();
  });
});
