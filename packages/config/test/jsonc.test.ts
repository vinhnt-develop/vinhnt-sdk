import { describe, expect, it } from "vitest";
import { parseJsonc } from "../src/jsonc.js";

describe("parseJsonc", () => {
  it("parses plain JSON", () => {
    const result = parseJsonc<{ a: number }>('{"a": 1}');
    expect(result.a).toBe(1);
  });

  it("strips single-line comments", () => {
    const text = `
      {
        // this is a comment
        "a": 1
      }
    `;
    const result = parseJsonc<{ a: number }>(text);
    expect(result.a).toBe(1);
  });

  it("strips multi-line comments", () => {
    const text = `
      {
        /* multi
           line */
        "a": 1
      }
    `;
    const result = parseJsonc<{ a: number }>(text);
    expect(result.a).toBe(1);
  });

  it("preserves string values containing //", () => {
    const text = '{ "url": "http://example.com/foo" }';
    const result = parseJsonc<{ url: string }>(text);
    expect(result.url).toBe("http://example.com/foo");
  });

  it("preserves string values containing /*", () => {
    const text = '{ "code": "a /* not a comment */ b" }';
    const result = parseJsonc<{ code: string }>(text);
    expect(result.code).toBe("a /* not a comment */ b");
  });

  it("handles empty object", () => {
    const result = parseJsonc("{}");
    expect(result).toEqual({});
  });

  it("handles nested comments", () => {
    const text = `
      {
        // outer comment
        "nested": {
          /* inner comment */
          "b": 2
        }
      }
    `;
    const result = parseJsonc<{ nested: { b: number } }>(text);
    expect(result.nested.b).toBe(2);
  });
});
