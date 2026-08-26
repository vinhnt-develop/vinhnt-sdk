import { describe, expect, it } from "vitest";
import { checkExternalPaths, PATH_AWARE_TOOLS } from "../src/path-policy.js";

describe("checkExternalPaths", () => {
  const root = "C:/workspace";

  it("returns undefined for non-path-aware tools", () => {
    expect(checkExternalPaths("bash_script", { path: "C:/etc/passwd" }, root)).toBeUndefined();
    expect(PATH_AWARE_TOOLS.has("bash_script")).toBe(false);
  });

  it("allows paths inside the workspace root", () => {
    expect(checkExternalPaths("read_file", { filePath: "src/a.ts" }, root)).toBeUndefined();
    expect(checkExternalPaths("read_file", { path: `${root}/src/a.ts` }, root)).toBeUndefined();
  });

  it("rejects paths outside the workspace root", () => {
    const reason = checkExternalPaths("read_file", { filePath: "C:/etc/passwd" }, root);
    expect(reason).toBeDefined();
    expect(reason).toContain("outside workspace");
  });

  it("rejects relative escapes via ..", () => {
    const reason = checkExternalPaths("write_file", { path: "../leak.txt" }, root);
    expect(reason).toBeDefined();
    expect(reason).toContain("outside workspace");
  });

  it("is a no-op without a workspace root", () => {
    expect(checkExternalPaths("read_file", { filePath: "C:/etc/passwd" }, undefined)).toBeUndefined();
  });

  it("covers every path-aware tool", () => {
    expect(PATH_AWARE_TOOLS).toContain("read_file");
    expect(PATH_AWARE_TOOLS).toContain("edit_file");
    expect(PATH_AWARE_TOOLS).toContain("shell");
    expect(PATH_AWARE_TOOLS).toContain("read_image");
  });
});
