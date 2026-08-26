import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "../src/yaml-frontmatter.js";

describe("parseFrontmatter", () => {
  it("parses simple key: value frontmatter", () => {
    const raw = `---
name: hello
version: 1
---
Body text`;
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter.name).toBe("hello");
    expect(frontmatter.version).toBe(1);
    expect(body).toBe("Body text");
  });

  it("parses boolean values", () => {
    const raw = `---
enabled: true
disabled: false
---
body`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.enabled).toBe(true);
    expect(frontmatter.disabled).toBe(false);
  });

  it("parses numeric values", () => {
    const raw = `---
count: 42
ratio: 3.14
---
body`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.count).toBe(42);
    expect(frontmatter.ratio).toBe(3.14);
  });

  it("parses quoted strings", () => {
    const raw = `---
title: "hello world"
desc: 'single quoted'
---
body`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.title).toBe("hello world");
    expect(frontmatter.desc).toBe("single quoted");
  });

  it("parses nested objects", () => {
    const raw = `---
server:
  host: localhost
  port: 8080
---
body`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.server).toEqual({ host: "localhost", port: 8080 });
  });

  it("parses inline list items (- syntax)", () => {
    const raw = `---
tags: "- alpha"
---
body`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.tags).toBe("- alpha");
  });

  it("skips comment lines", () => {
    const raw = `---
# this is a comment
name: test
---
body`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.name).toBe("test");
  });

  it("trims body", () => {
    const raw = `---
x: 1
---

  Body with spaces  `;
    const { body } = parseFrontmatter(raw);
    expect(body).toBe("Body with spaces");
  });

  it("throws when no frontmatter", () => {
    expect(() => parseFrontmatter("just body")).toThrow(/must start with/);
  });

  it("handles empty frontmatter", () => {
    const raw = `---

---
body`;
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({});
    expect(body).toBe("body");
  });

  it("handles deeply nested objects", () => {
    const raw = `---
a:
  b:
    c: deep
---
body`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.a).toEqual({ b: { c: "deep" } });
  });

  it("overwrites keys at same level (last wins)", () => {
    const raw = `---
key: first
key: second
---
body`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.key).toBe("second");
  });

  it("parses body without trailing newline after second ---", () => {
    const raw = `---
x: 1
---
body`;
    const { body } = parseFrontmatter(raw);
    expect(body).toBe("body");
  });
});
