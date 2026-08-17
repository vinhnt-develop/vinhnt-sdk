import { describe, it, expect } from "vitest";
import { parseCommand } from "../src/shell-parser.js";

describe("parseCommand", () => {
  it("splits simple unquoted commands", () => {
    expect(parseCommand("git status")).toEqual({ file: "git", args: ["status"] });
  });

  it("keeps double-quoted tokens as single arguments", () => {
    expect(parseCommand('"C:/Program Files/nodejs/node.exe" "C:/tmp/echo.js"')).toEqual({
      file: "C:/Program Files/nodejs/node.exe",
      args: ["C:/tmp/echo.js"],
    });
  });

  it("handles quoted args after an unquoted binary", () => {
    expect(parseCommand('echo "hello world" "foo bar"')).toEqual({
      file: "echo",
      args: ["hello world", "foo bar"],
    });
  });

  it("handles single quotes", () => {
    expect(parseCommand("echo 'hello world'")).toEqual({
      file: "echo",
      args: ["hello world"],
    });
  });

  it("handles backslash escapes inside double quotes", () => {
    expect(parseCommand('echo "a\\"b"')).toEqual({ file: "echo", args: ['a"b'] });
  });

  it("handles backslash escapes outside quotes", () => {
    expect(parseCommand("echo hello\\ world")).toEqual({ file: "echo", args: ["hello world"] });
  });

  it("collapses whitespace", () => {
    expect(parseCommand("  git    status   --short ")).toEqual({
      file: "git",
      args: ["status", "--short"],
    });
  });

  it("returns empty file for empty input", () => {
    expect(parseCommand("   ")).toEqual({ file: "", args: [] });
    expect(parseCommand("")).toEqual({ file: "", args: [] });
  });

  it("extracts args for nested tool commands", () => {
    expect(parseCommand('npm install --save "express@^4"')).toEqual({
      file: "npm",
      args: ["install", "--save", "express@^4"],
    });
  });
});