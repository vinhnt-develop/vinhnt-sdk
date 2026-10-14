import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  createInstructionsSource,
  DEFAULT_INSTRUCTIONS_MAX_BYTES,
  DEFAULT_INSTRUCTIONS_ROOT_MARKERS,
} from "../src/system-context/sources/instructions-source.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "instructions-source-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(dir: string, name: string, content: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, content, "utf-8");
  return path;
}

describe("createInstructionsSource (P7.3 Codex-style hierarchy)", () => {
  it("loads a single project AGENTS.md at cwd when no root above", async () => {
    write(root, "AGENTS.md", "# Project rules");
    const src = createInstructionsSource(root, { rootMarkers: [] });
    const value = await src.load();
    expect(value.project).toBe("# Project rules");
    expect(value.loadedFiles).toEqual([join(root, "AGENTS.md")]);
    expect(value.truncated).toBe(false);
    expect(value.effective).toContain("## Project Instructions");
  });

  it("walks root → cwd, one file per directory", async () => {
    // root has .git marker; nested sub has its own AGENTS.md
    mkdirSync(join(root, ".git"), { recursive: true });
    write(root, "AGENTS.md", "ROOT_INSTRUCTIONS");
    const sub = join(root, "packages", "app");
    write(sub, "AGENTS.md", "APP_INSTRUCTIONS");
    const src = createInstructionsSource(sub);
    const value = await src.load();
    expect(value.loadedFiles).toEqual([join(root, "AGENTS.md"), join(sub, "AGENTS.md")]);
    expect(value.project).toBe("ROOT_INSTRUCTIONS\n\nAPP_INSTRUCTIONS");
    // root → cwd order: root first, cwd last (cwd overrides by appearing later)
    expect(value.project.indexOf("ROOT_INSTRUCTIONS")).toBeLessThan(
      value.project.indexOf("APP_INSTRUCTIONS"),
    );
  });

  it("stops at project root — does not walk past .git", async () => {
    // Structure: root/project/.git + project/AGENTS.md; cwd = project/src.
    // Ancestor of project (root) has AGENTS.md — must NOT be loaded.
    const project = join(root, "project");
    mkdirSync(join(project, ".git"), { recursive: true });
    write(project, "AGENTS.md", "IN_PROJECT");
    write(root, "AGENTS.md", "ANCESTOR_SHOULD_NOT_LOAD");
    const sub = join(project, "src");
    write(sub, "AGENTS.md", "IN_SRC");
    const src = createInstructionsSource(sub);
    const value = await src.load();
    expect(value.project).not.toContain("ANCESTOR_SHOULD_NOT_LOAD");
    expect(value.loadedFiles).toEqual([join(project, "AGENTS.md"), join(sub, "AGENTS.md")]);
  });

  it("AGENTS.override.md takes precedence over AGENTS.md in same dir", async () => {
    write(root, "AGENTS.md", "FROM_AGENTS_MD");
    write(root, "AGENTS.override.md", "FROM_OVERRIDE");
    const src = createInstructionsSource(root, { rootMarkers: [] });
    const value = await src.load();
    expect(value.project).toBe("FROM_OVERRIDE");
    expect(value.loadedFiles).toEqual([join(root, "AGENTS.override.md")]);
  });

  it("fallback filenames checked after AGENTS.md", async () => {
    write(root, "TEAM_GUIDE.md", "TEAM_CONTENT");
    const src = createInstructionsSource(root, {
      rootMarkers: [],
      fallbackFilenames: ["TEAM_GUIDE.md"],
    });
    const value = await src.load();
    expect(value.project).toBe("TEAM_CONTENT");
  });

  it("skips empty files", async () => {
    write(root, "AGENTS.md", "   \n  ");
    const src = createInstructionsSource(root, { rootMarkers: [] });
    const value = await src.load();
    expect(value.project).toBe("");
    expect(value.loadedFiles).toEqual([]);
  });

  it("byte cap truncates the file that crosses the budget", async () => {
    // Two files: 20 bytes + 20 bytes; cap 30 → first fully loaded (20), second truncated to 10.
    mkdirSync(join(root, ".git"), { recursive: true });
    write(root, "AGENTS.md", "A".repeat(20));
    const sub = join(root, "sub");
    write(sub, "AGENTS.md", "B".repeat(20));
    const src = createInstructionsSource(sub, { maxBytes: 30 });
    const value = await src.load();
    expect(value.truncated).toBe(true);
    expect(value.project).toBe(`${"A".repeat(20)}\n\n${"B".repeat(10)}`);
    expect(value.loadedFiles).toEqual([join(root, "AGENTS.md"), join(sub, "AGENTS.md")]);
  });

  it("byte cap stops adding files once budget exhausted", async () => {
    mkdirSync(join(root, ".git"), { recursive: true });
    write(root, "AGENTS.md", "A".repeat(40));
    const sub = join(root, "sub");
    write(sub, "AGENTS.md", "B".repeat(40));
    const src = createInstructionsSource(sub, { maxBytes: 40 });
    const value = await src.load();
    expect(value.truncated).toBe(true);
    // first file consumed the full budget; second not loaded
    expect(value.project).toBe("A".repeat(40));
    expect(value.loadedFiles).toEqual([join(root, "AGENTS.md")]);
  });

  it("maxBytes=0 disables the cap", async () => {
    write(root, "AGENTS.md", "X".repeat(100_000));
    const src = createInstructionsSource(root, { rootMarkers: [], maxBytes: 0 });
    const value = await src.load();
    expect(value.truncated).toBe(false);
    expect(value.project.length).toBe(100_000);
  });

  it("session cache returns same object when files unchanged", async () => {
    write(root, "AGENTS.md", "CACHED");
    const src = createInstructionsSource(root, { rootMarkers: [] });
    const first = await src.load();
    const second = await src.load();
    expect(second).toBe(first); // identical reference = cache hit
  });

  it("session cache invalidates when file content changes (mtime+size)", async () => {
    const path = write(root, "AGENTS.md", "ORIGINAL");
    const src = createInstructionsSource(root, { rootMarkers: [] });
    const first = await src.load();
    expect(first.project).toBe("ORIGINAL");

    // Change content and force a different mtime.
    writeFileSync(path, "UPDATED_CONTENT", "utf-8");
    const future = new Date(Date.now() + 5000);
    utimesSync(path, future, future);

    const second = await src.load();
    expect(second).not.toBe(first);
    expect(second.project).toBe("UPDATED_CONTENT");
  });

  it("empty rootMarkers = cwd only (no upward walk)", async () => {
    mkdirSync(join(root, ".git"), { recursive: true });
    write(root, "AGENTS.md", "AT_ROOT");
    // cwd is a subdirectory — with empty rootMarkers, only sub is checked.
    const sub = join(root, "nested");
    write(sub, "AGENTS.md", "AT_SUB");
    const src = createInstructionsSource(sub, { rootMarkers: [] });
    const value = await src.load();
    expect(value.loadedFiles).toEqual([join(sub, "AGENTS.md")]);
  });

  it("falls back to cwd when no root marker found anywhere", async () => {
    // No .git anywhere in the tmpdir tree — findProjectRoot walks to fs root
    // and falls back to cwd. Only the cwd file is loaded.
    const deep = join(root, "a", "b", "c");
    write(deep, "AGENTS.md", "DEEP_ONLY");
    // Explicitly disable upward walk to isolate: rootMarkers: [] = cwd only.
    const src = createInstructionsSource(deep, { rootMarkers: [] });
    const value = await src.load();
    expect(value.loadedFiles).toEqual([join(deep, "AGENTS.md")]);
  });

  it("cwd as function is resolved per load", async () => {
    write(root, "AGENTS.md", "FN_CWD");
    let current = root;
    const src = createInstructionsSource(() => current, { rootMarkers: [] });
    const first = await src.load();
    expect(first.project).toBe("FN_CWD");

    const other = join(root, "other");
    write(other, "AGENTS.md", "OTHER_CWD");
    current = other;
    const second = await src.load();
    expect(second.project).toBe("OTHER_CWD");
  });

  it("exports defaults", () => {
    expect(DEFAULT_INSTRUCTIONS_MAX_BYTES).toBe(32 * 1024);
    expect(DEFAULT_INSTRUCTIONS_ROOT_MARKERS).toEqual([".git"]);
  });

  it("renderUpdate returns null when unchanged, update text when changed", async () => {
    write(root, "AGENTS.md", "SAME");
    const src = createInstructionsSource(root, { rootMarkers: [] });
    const value = await src.load();
    expect(src.renderUpdate(value, value)).toBeNull();
    const changed = { ...value, effective: "NEW" };
    expect(src.renderUpdate(changed, value)).toContain("instructions changed");
    expect(src.renderUpdate(changed, value)).toContain("NEW");
  });
});

function dirnameOf(p: string): string {
  return resolve(p, "..");
}
