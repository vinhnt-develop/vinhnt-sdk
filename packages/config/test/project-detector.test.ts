import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({ existsSync: vi.fn() }));
vi.mock("node:os", () => ({ homedir: () => "/home/user" }));

import { existsSync } from "node:fs";
import { detectProjectLayout, detectCompatDirs, hasVntInfrastructure } from "../src/project-detector.js";

describe("detectProjectLayout", () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
  });

  it("returns builtin as default when no dirs exist", () => {
    const layout = detectProjectLayout("/project");
    expect(layout.agentDirs).toHaveLength(1);
    expect(layout.agentDirs[0]!.type).toBe("builtin");
    expect(layout.skillDirs).toHaveLength(0);
    expect(layout.detected).toEqual([]);
  });

  it("detects global agent/skill dirs", () => {
    vi.mocked(existsSync).mockImplementation(
      (p: string) => p.includes("agents") || p.includes("skills"),
    );
    const layout = detectProjectLayout("/project");
    expect(layout.agentDirs.some((d) => d.type === "global")).toBe(true);
    expect(layout.skillDirs.some((d) => d.type === "global")).toBe(true);
    expect(layout.detected).toContain("~/.config/vnt/agents/");
    expect(layout.detected).toContain("~/.config/vnt/skills/");
  });

  it("detects project .vnt dirs", () => {
    vi.mocked(existsSync).mockImplementation(
      (p: string) => p.includes(".vnt") && (p.includes("agents") || p.includes("skills")),
    );
    const layout = detectProjectLayout("/project");
    expect(layout.agentDirs.some((d) => d.type === "project")).toBe(true);
    expect(layout.detected).toContain(".vnt/agents/");
  });

  it("detects compat dirs in priority order", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const layout = detectProjectLayout("/project");
    expect(layout.agentDirs.length).toBeGreaterThanOrEqual(3); // builtin + global + project + ...
    expect(layout.agentDirs[1]!.type).toBe("global");
    expect(layout.agentDirs[2]!.type).toBe("project");
    expect(layout.agentDirs[3]!.type).toBe("compat");
  });

  it("uses cwd when no projectDir given", () => {
    const origCwd = process.cwd;
    process.cwd = () => "/current-dir";
    vi.mocked(existsSync).mockReturnValue(true);
    const layout = detectProjectLayout();
    expect(layout.root).toBe("/current-dir");
    process.cwd = origCwd;
  });
});

describe("detectCompatDirs", () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
  });

  it("returns empty when no compat dirs exist", () => {
    expect(detectCompatDirs("/project")).toEqual([]);
  });

  it("detects .agents directory", () => {
    vi.mocked(existsSync).mockImplementation(
      (p: string) => (p as string).includes(".agents") || p.includes("skills"),
    );
    const dirs = detectCompatDirs("/project");
    expect(dirs.length).toBeGreaterThan(0);
    expect(dirs.some((d) => d.includes(".agents"))).toBe(true);
  });

  it("detects .claude directories", () => {
    vi.mocked(existsSync).mockImplementation(
      (p: string) => p.includes(".claude"),
    );
    const dirs = detectCompatDirs("/project");
    expect(dirs.some((d) => d.includes(".claude"))).toBe(true);
  });
});

describe("hasVntInfrastructure", () => {
  it("returns true when .vnt/agents exists", () => {
    vi.mocked(existsSync).mockImplementation(
      (p: string) => p.includes(".vnt") && p.includes("agents"),
    );
    expect(hasVntInfrastructure("/project")).toBe(true);
  });

  it("returns false when no vnt dirs", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(hasVntInfrastructure("/project")).toBe(false);
  });
});
