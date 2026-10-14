import { describe, it, expect } from "vitest";
// Import through the package barrel so the public exports stay live
// (dead-export gate) — consumers only ever see `@vinhnt-sdk/core` names.
import {
  createWorldState,
  applyWorldStatePatch,
  diffWorldStateSnapshots,
} from "../src/index.js";
import type { WorldStateSection } from "../src/context/world-state.js";

function envSection(cwd: string, branch?: string): WorldStateSection {
  return {
    id: "env",
    snapshot: branch !== undefined ? { cwd, branch } : { cwd },
    renderDiff(previous) {
      if (!previous) return `Environment: cwd=${cwd}${branch ? ` branch=${branch}` : ""}`;
      const prev = previous as { cwd?: string; branch?: string };
      if (prev.cwd !== cwd) return `Environment cwd changed: ${prev.cwd} → ${cwd}`;
      if (prev.branch !== branch) return `Environment branch changed: ${prev.branch} → ${branch}`;
      return null;
    },
  };
}

function filesSection(files: string[]): WorldStateSection {
  return {
    id: "files",
    snapshot: { list: files },
    renderDiff(previous) {
      if (!previous) return `Files: ${files.join(", ")}`;
      const prev = previous as { list: string[] };
      const added = files.filter((f) => !prev.list.includes(f));
      const removed = prev.list.filter((f) => !files.includes(f));
      const parts: string[] = [];
      if (added.length) parts.push(`+${added.join(",")}`);
      if (removed.length) parts.push(`-${removed.join(",")}`);
      return parts.length ? `Files changed: ${parts.join(" ")}` : null;
    },
  };
}

describe("WorldState (Codex-style context diff)", () => {
  it("renderFull renders every section without previous state", () => {
    const ws = createWorldState();
    ws.addSection(envSection("/home/project", "main"));
    ws.addSection(filesSection(["a.ts", "b.ts"]));
    const full = ws.renderFull();
    expect(full).toContain("Environment: cwd=/home/project branch=main");
    expect(full).toContain("Files: a.ts, b.ts");
  });

  it("advance on first call emits full fragments + full snapshot patch", () => {
    const ws = createWorldState();
    ws.addSection(envSection("/home/project", "main"));
    const result = ws.advance();
    expect(result.changed).toBe(true);
    expect(result.rendered).toContain("Environment: cwd=/home/project");
    // First advance: baseline was empty → patch includes the full section.
    expect(result.patch).toEqual({ env: { cwd: "/home/project", branch: "main" } });
  });

  it("advance with no changes returns changed=false", () => {
    const ws = createWorldState();
    ws.addSection(envSection("/home/project", "main"));
    ws.advance(); // establish baseline
    const result = ws.advance();
    expect(result.changed).toBe(false);
    expect(result.rendered).toBe("");
    expect(result.patch).toBeUndefined();
  });

  it("advance emits only the changed section's diff", () => {
    const ws = createWorldState();
    ws.addSection(envSection("/home/project", "main"));
    ws.addSection(filesSection(["a.ts"]));
    ws.advance(); // baseline

    ws.setSection(envSection("/new/project", "main"));
    const result = ws.advance();
    expect(result.changed).toBe(true);
    expect(result.rendered).toBe("Environment cwd changed: /home/project → /new/project");
    expect(result.rendered).not.toContain("Files");
    expect(result.patch).toEqual({ env: { cwd: "/new/project" } });
  });

  it("advanceFrom uses external baseline without mutating internal", () => {
    const ws = createWorldState();
    ws.addSection(envSection("/home/project", "main"));
    const external = { sections: { env: { cwd: "/old/project", branch: "dev" } } };
    const result = ws.advanceFrom(external);
    expect(result.changed).toBe(true);
    expect(result.rendered).toContain("cwd changed: /old/project → /home/project");
    // Internal baseline unchanged → next advance() still sees empty baseline.
    const again = ws.advance();
    expect(again.changed).toBe(true);
    expect(again.rendered).toContain("Environment: cwd=/home/project");
  });

  it("reset replaces baseline (compaction scenario)", () => {
    const ws = createWorldState();
    ws.addSection(envSection("/home/project", "main"));
    ws.advance();
    const snapshot = ws.snapshot();
    ws.reset(snapshot);
    const result = ws.advance();
    expect(result.changed).toBe(false);
  });

  it("removeSection drops the section", () => {
    const ws = createWorldState();
    ws.addSection(envSection("/home/project", "main"));
    ws.advance();
    ws.removeSection("env");
    const result = ws.advance();
    // Section gone → patch has null for removal.
    expect(result.changed).toBe(true);
    expect(result.patch).toEqual({ env: null });
  });

  it("duplicate section ID throws", () => {
    const ws = createWorldState();
    ws.addSection(envSection("/a"));
    expect(() => ws.addSection(envSection("/b"))).toThrow(/duplicate/);
  });

  it("undefined snapshot sections are skipped", () => {
    const ws = createWorldState();
    ws.addSection({
      id: "pending",
      snapshot: undefined,
      renderDiff: () => "should not render",
    });
    ws.addSection(envSection("/home/project", "main"));
    const full = ws.renderFull();
    expect(full).not.toContain("should not render");
    expect(full).toContain("Environment");
  });

  it("applyWorldStatePatch + diffWorldStateSnapshots round-trip", () => {
    const ws = createWorldState();
    ws.addSection(envSection("/a", "main"));
    ws.advance();
    const prev = ws.snapshot();

    ws.setSection(envSection("/b", "dev"));
    const current = ws.snapshot();
    const patch = diffWorldStateSnapshots(prev, current);
    expect(patch).toEqual({ env: { cwd: "/b", branch: "dev" } });
    expect(applyWorldStatePatch(prev, patch!)).toEqual(current);
  });

  it("nested section diff handles object → scalar and back", () => {
    const ws = createWorldState();
    ws.addSection({
      id: "cfg",
      snapshot: { mode: { kind: "fast", level: 2 } },
      renderDiff: () => "cfg full",
    });
    ws.advance();
    ws.setSection({
      id: "cfg",
      snapshot: { mode: "simple" },
      renderDiff: () => "cfg simplified",
    });
    const result = ws.advance();
    expect(result.changed).toBe(true);
    expect(result.patch).toEqual({ cfg: { mode: "simple" } });
  });
});
