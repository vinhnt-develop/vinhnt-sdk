import { describe, it, expect } from "vitest";
import { parseYaml, isYamlFile } from "../src/yaml.js";

describe("parseYaml", () => {
  it("parses basic YAML to object", () => {
    const result = parseYaml("defaultProvider: anthropic\nmaxSteps: 10\n");
    expect(result).toEqual({ defaultProvider: "anthropic", maxSteps: 10 });
  });

  it("parses nested YAML", () => {
    const result = parseYaml("providers:\n  openai:\n    apiKey: sk-test\n");
    expect(result).toEqual({ providers: { openai: { apiKey: "sk-test" } } });
  });

  it("parses boolean values", () => {
    const result = parseYaml("auto: true\n");
    expect(result).toEqual({ auto: true });
  });

  it("parses number values", () => {
    const result = parseYaml("maxSteps: 25\nmaxTokens: 8192\n");
    expect(result).toEqual({ maxSteps: 25, maxTokens: 8192 });
  });

  it("parses arrays", () => {
    const result = parseYaml("agentDirs:\n  - ./my-agents\n  - ./more-agents\n");
    expect(result).toEqual({ agentDirs: ["./my-agents", "./more-agents"] });
  });

  it("throws on non-object YAML", () => {
    expect(() => parseYaml("hello")).toThrow("YAML root must be an object");
  });

  it("throws on scalar YAML", () => {
    expect(() => parseYaml("42")).toThrow("YAML root must be an object");
  });

  it("throws on null YAML", () => {
    expect(() => parseYaml("~")).toThrow("YAML root must be an object");
  });

  it("throws on array YAML", () => {
    expect(() => parseYaml("- one\n- two\n")).toThrow("YAML root must be an object");
  });
});

describe("isYamlFile", () => {
  it("detects .yaml extension", () => {
    expect(isYamlFile("config.yaml")).toBe(true);
  });

  it("detects .yml extension", () => {
    expect(isYamlFile("config.yml")).toBe(true);
  });

  it("rejects .json extension", () => {
    expect(isYamlFile("config.json")).toBe(false);
  });

  it("rejects .jsonc extension", () => {
    expect(isYamlFile("config.jsonc")).toBe(false);
  });

  it("handles uppercase extensions", () => {
    expect(isYamlFile("config.YAML")).toBe(true);
  });

  it("rejects no extension", () => {
    expect(isYamlFile("config")).toBe(false);
  });
});
