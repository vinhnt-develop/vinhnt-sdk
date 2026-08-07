import { describe, it, expect, vi } from "vitest";
import { DiagnosticStore, formatDiagnostics, formatDiagnostic, countErrors, countWarnings } from "../src/diagnostics.js";
import type { LspDiagnostic } from "../src/types.js";

describe("DiagnosticStore", () => {
  it("stores and retrieves diagnostics", () => {
    const store = new DiagnosticStore();
    const diag: LspDiagnostic = { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }, message: "test", severity: 1 };
    store.set("file:///test.ts", [diag]);
    const stored = store.get("file:///test.ts");
    expect(stored).toBeDefined();
    expect(stored!.diagnostics).toHaveLength(1);
    expect(stored!.diagnostics[0].message).toBe("test");
  });

  it("returns undefined for missing uri", () => {
    const store = new DiagnosticStore();
    expect(store.get("file:///nonexistent.ts")).toBeUndefined();
  });

  it("clears diagnostics for a uri", () => {
    const store = new DiagnosticStore();
    store.set("file:///test.ts", []);
    expect(store.get("file:///test.ts")).toBeDefined();
    store.clear("file:///test.ts");
    expect(store.get("file:///test.ts")).toBeUndefined();
  });

  it("clears all diagnostics", () => {
    const store = new DiagnosticStore();
    store.set("file:///a.ts", [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "a" }]);
    store.set("file:///b.ts", [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "b" }]);
    store.clearAll();
    expect(store.get("file:///a.ts")).toBeUndefined();
    expect(store.get("file:///b.ts")).toBeUndefined();
  });

  it("getAll returns all entries", () => {
    const store = new DiagnosticStore();
    store.set("file:///a.ts", []);
    store.set("file:///b.ts", []);
    expect(store.getAll()).toHaveLength(2);
  });

  it("waitForDiagnostics resolves immediately if data exists", async () => {
    const store = new DiagnosticStore();
    store.set("file:///test.ts", [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "hi" }]);
    const result = await store.waitForDiagnostics("file:///test.ts", 1000);
    expect(result).toHaveLength(1);
  });

  it("waitForDiagnostics waits for data to arrive", async () => {
    const store = new DiagnosticStore();
    const promise = store.waitForDiagnostics("file:///deferred.ts", 5000);
    setTimeout(() => {
      store.set("file:///deferred.ts", [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "deferred" }]);
    }, 10);
    const result = await promise;
    expect(result).toHaveLength(1);
    expect(result[0].message).toBe("deferred");
  });

  it("waitForDiagnostics times out and returns empty", async () => {
    const store = new DiagnosticStore();
    const result = await store.waitForDiagnostics("file:///timeout.ts", 50);
    expect(result).toEqual([]);
  });

  it("tracks monotonically increasing versions", () => {
    const store = new DiagnosticStore();
    expect(store.version("file:///v.ts")).toBe(0);
    store.set("file:///v.ts", []);
    expect(store.version("file:///v.ts")).toBe(1);
    store.set("file:///v.ts", []);
    expect(store.version("file:///v.ts")).toBe(2);
  });

  it("waitForDiagnostics waits for a NEWER version after an existing one", async () => {
    const store = new DiagnosticStore();
    store.set("file:///update.ts", [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "old" }]);
    const sinceVersion = store.version("file:///update.ts"); // 1
    const promise = store.waitForDiagnostics("file:///update.ts", 5000, sinceVersion);
    setTimeout(() => {
      store.set("file:///update.ts", [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "new" }]);
    }, 10);
    const result = await promise;
    expect(result[0].message).toBe("new");
  });

  it("waitForDiagnostics returns immediately when version already newer", async () => {
    const store = new DiagnosticStore();
    store.set("file:///fresh.ts", [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "x" }]);
    store.set("file:///fresh.ts", [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "y" }]);
    const result = await store.waitForDiagnostics("file:///fresh.ts", 50, 0);
    expect(result[0].message).toBe("y");
  });
});

describe("formatDiagnostic", () => {
  it("formats error", () => {
    const d: LspDiagnostic = { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, message: "bad", severity: 1 };
    expect(formatDiagnostic(d)).toContain("ERROR");
    expect(formatDiagnostic(d)).toContain("1:1");
    expect(formatDiagnostic(d)).toContain("bad");
  });

  it("formats warning", () => {
    const d: LspDiagnostic = { range: { start: { line: 2, character: 3 }, end: { line: 2, character: 8 } }, message: "warn", severity: 2 };
    expect(formatDiagnostic(d)).toContain("WARN");
    expect(formatDiagnostic(d)).toContain("3:4");
  });

  it("handles missing severity as hint", () => {
    const d: LspDiagnostic = { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "hint" };
    expect(formatDiagnostic(d)).toContain("HINT");
  });
});

describe("formatDiagnostics", () => {
  it("returns empty string for empty array", () => {
    expect(formatDiagnostics([])).toBe("");
  });

  it("groups by severity", () => {
    const diags: LspDiagnostic[] = [
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "err1", severity: 1 },
      { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 1 } }, message: "err2", severity: 1 },
      { range: { start: { line: 2, character: 0 }, end: { line: 2, character: 1 } }, message: "warn1", severity: 2 },
    ];
    const result = formatDiagnostics(diags);
    expect(result).toContain("Errors (2)");
    expect(result).toContain("Warnings (1)");
    expect(result).toContain("err1");
    expect(result).toContain("warn1");
  });
});

describe("countErrors / countWarnings", () => {
  it("counts errors correctly", () => {
    const diags: LspDiagnostic[] = [
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "e", severity: 1 },
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "w", severity: 2 },
      { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "i", severity: 3 },
    ];
    expect(countErrors(diags)).toBe(1);
    expect(countWarnings(diags)).toBe(1);
  });
});
