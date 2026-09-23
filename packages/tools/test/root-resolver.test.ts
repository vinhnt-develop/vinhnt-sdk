import { describe, expect, it } from "vitest";
import { resolveRoot, resolveToolRoot } from "../src/root-resolver.js";

describe("resolveRoot", () => {
  it("returns static path as-is", () => {
    expect(resolveRoot("/tmp/ws")).toBe("/tmp/ws");
  });

  it("invokes lazy getter", () => {
    expect(resolveRoot(() => "/tmp/lazy")).toBe("/tmp/lazy");
  });
});

describe("resolveToolRoot (P0-5 per-run workspace root)", () => {
  it("prefers ctx.workspaceRoot over factory root", () => {
    expect(resolveToolRoot("/tmp/factory", { workspaceRoot: "/tmp/project" })).toBe("/tmp/project");
  });

  it("falls back to factory root when ctx has no workspaceRoot", () => {
    expect(resolveToolRoot("/tmp/factory", {})).toBe("/tmp/factory");
    expect(resolveToolRoot("/tmp/factory", undefined)).toBe("/tmp/factory");
  });

  it("resolves lazy factory root when no per-run override", () => {
    expect(resolveToolRoot(() => "/tmp/lazy", undefined)).toBe("/tmp/lazy");
  });

  it("prefers ctx.workspaceRoot even with lazy factory root", () => {
    expect(resolveToolRoot(() => "/tmp/lazy", { workspaceRoot: "/tmp/run" })).toBe("/tmp/run");
  });
});
