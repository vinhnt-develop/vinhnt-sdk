import { describe, it, expect } from "vitest";
import { lintToolDescription, lintToolDefinitions } from "@vinhnt-sdk/tools";

function codes(desc: string): string[] {
  return lintToolDescription("t", desc).issues.map((i) => i.code);
}

describe("lintToolDescription", () => {
  it("accepts real-world quality descriptions", () => {
    expect(codes("Fetch content from a URL and return it as text. Max 512KB.")).toEqual([]);
    expect(codes("Show working tree status (git status --short + branch info).")).toEqual([]);
    expect(codes("Recursively find files matching a pattern in the workspace.")).toEqual([]);
    expect(codes("Search file contents for a regex pattern. Returns matches with line numbers.")).toEqual([]);
  });

  it("flags empty description", () => {
    const report = lintToolDescription("t", "   ");
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]!.code).toBe("empty");
  });

  it("flags too-short descriptions", () => {
    expect(codes("Do stuff")).toContain("too-short");
  });

  it("flags descriptions that do not start with a verb", () => {
    expect(codes("The file operations utility for the workspace.")).toContain("no-verb");
  });

  it("flags vague descriptions with too few words", () => {
    expect(codes("Tool to do")).toContain("vague");
  });

  it("flags placeholder text", () => {
    expect(codes("Create a thing. TODO: finish this description later.")).toContain("placeholder");
  });

  it("flags over-long descriptions", () => {
    const long = "Execute a shell command inside the workspace directory and capture both standard output and standard error streams for the model to inspect, trimming trailing whitespace and applying a configurable timeout while respecting the shell environment and path-aware sandboxing rules defined by the platform.".repeat(1);
    expect(codes(long)).toContain("too-long");
  });

  it("reports multiple issues at once", () => {
    const report = lintToolDescription("bad", "do it TODO");
    const issueCodes = report.issues.map((i) => i.code);
    expect(issueCodes).toContain("too-short");
    expect(issueCodes).toContain("placeholder");
  });
});

describe("lintToolDefinitions", () => {
  it("returns only definitions with issues", () => {
    const reports = lintToolDefinitions([
      { id: "good", description: "Fetch content from a URL and return it as text." },
      { id: "bad", description: "Do stuff" },
      { id: "ok", description: "Search file contents for a regex pattern." },
    ]);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.tool).toBe("bad");
  });

  it("returns an empty array when all descriptions are clean", () => {
    const reports = lintToolDefinitions([
      { id: "a", description: "Read the contents of a file from the workspace." },
      { id: "b", description: "Execute a shell command in the workspace directory." },
    ]);
    expect(reports).toEqual([]);
  });
});
