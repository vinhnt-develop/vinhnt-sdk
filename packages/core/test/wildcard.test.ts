import { describe, expect, it } from "vitest";
import { wildcardMatch } from "@vinhnt-sdk/schema";

describe("wildcardMatch", () => {
  it("* matches everything", () => {
    expect(wildcardMatch("*", "anything")).toBe(true);
    expect(wildcardMatch("*", "")).toBe(true);
    expect(wildcardMatch("*", "tool.read_file")).toBe(true);
  });

  it("exact match without wildcards", () => {
    expect(wildcardMatch("read_file", "read_file")).toBe(true);
    expect(wildcardMatch("read_file", "write_file")).toBe(false);
  });

  it("tool.* matches any tool", () => {
    expect(wildcardMatch("tool.*", "tool.read_file")).toBe(true);
    expect(wildcardMatch("tool.*", "tool.write_file")).toBe(true);
    expect(wildcardMatch("tool.*", "read_file")).toBe(false);
  });

  it("read:* matches read tools", () => {
    expect(wildcardMatch("read:*", "read:file")).toBe(true);
    expect(wildcardMatch("read:*", "read:search")).toBe(true);
    expect(wildcardMatch("read:*", "write:file")).toBe(false);
  });

  it("prefix match with suffix *", () => {
    expect(wildcardMatch("git_*", "git_status")).toBe(true);
    expect(wildcardMatch("git_*", "git_diff")).toBe(true);
    expect(wildcardMatch("git_*", "read_file")).toBe(false);
  });

  it("suffix match with prefix *", () => {
    expect(wildcardMatch("*_tool", "read_tool")).toBe(true);
    expect(wildcardMatch("*_tool", "write_tool")).toBe(true);
    expect(wildcardMatch("*_tool", "tool_read")).toBe(false);
  });

  it("? matches single character", () => {
    expect(wildcardMatch("tool.??", "tool.r")).toBe(false);
    expect(wildcardMatch("tool.??", "tool.re")).toBe(true);
    expect(wildcardMatch("tool.????_file", "tool.read_file")).toBe(true);
  });

  it("multiple * in pattern", () => {
    expect(wildcardMatch("a*b*c", "aXbYc")).toBe(true);
    expect(wildcardMatch("a*b*c", "abc")).toBe(true);
    expect(wildcardMatch("a*b*c", "aXYc")).toBe(false);
  });

  it("empty pattern only matches empty string", () => {
    expect(wildcardMatch("", "")).toBe(true);
    expect(wildcardMatch("", "anything")).toBe(false);
  });

  it("permission use cases: allowedTool patterns", () => {
    const allowed = ["read_*", "search_*", "list_*", "web_fetch"];
    const isAllowed = (name: string) => allowed.some((p) => wildcardMatch(p, name));

    expect(isAllowed("read_file")).toBe(true);
    expect(isAllowed("search_code")).toBe(true);
    expect(isAllowed("list_directory")).toBe(true);
    expect(isAllowed("web_fetch")).toBe(true);
    expect(isAllowed("write_file")).toBe(false);
    expect(isAllowed("shell")).toBe(false);
  });

  it("permission use cases: deniedTool patterns override allowed", () => {
    const allowed = ["tool.*"];
    const denied = ["tool.write_file", "tool.delete_*"];
    const isAllowed = (name: string) =>
      !denied.some((p) => wildcardMatch(p, name)) && allowed.some((p) => wildcardMatch(p, name));

    expect(isAllowed("tool.read_file")).toBe(true);
    expect(isAllowed("tool.search")).toBe(true);
    expect(isAllowed("tool.write_file")).toBe(false);
    expect(isAllowed("tool.delete_all")).toBe(false);
    expect(isAllowed("shell")).toBe(false);
  });

  it("** matches any sequence (same as *)", () => {
    expect(wildcardMatch("**", "anything")).toBe(true);
    expect(wildcardMatch("**", "")).toBe(true);
    expect(wildcardMatch("tool.**", "tool.read_file")).toBe(true);
    expect(wildcardMatch("tool.**", "tool.deep.nested.name")).toBe(true);
    expect(wildcardMatch("tool.**", "other")).toBe(false);
  });

  it("\\* matches literal asterisk", () => {
    expect(wildcardMatch("hello\\*", "hello*")).toBe(true);
    expect(wildcardMatch("hello\\*", "helloX")).toBe(false);
    expect(wildcardMatch("a\\*b", "a*b")).toBe(true);
    expect(wildcardMatch("a\\*b", "aXb")).toBe(false);
  });

  it("\\? matches literal question mark", () => {
    expect(wildcardMatch("hello\\?", "hello?")).toBe(true);
    expect(wildcardMatch("hello\\?", "helloX")).toBe(false);
    expect(wildcardMatch("file\\?.txt", "file?.txt")).toBe(true);
    expect(wildcardMatch("file\\?.txt", "fileX.txt")).toBe(false);
  });

  it("mixed: escaped + wildcard in same pattern", () => {
    expect(wildcardMatch("\\*\\?*", "*?anything")).toBe(true);
    expect(wildcardMatch("\\*\\?*", "*?")).toBe(true);
    expect(wildcardMatch("\\*\\?*", "*")).toBe(false);
    expect(wildcardMatch("\\*\\?*", "anything")).toBe(false);
  });
});
