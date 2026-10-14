import { describe, expect, it } from "vitest";
import { join } from "node:path";
import {
  AutoMemory,
  createNodeAutoMemoryFs,
  parseAutoMemoryIndex,
  renderAutoMemoryIndex,
  countAutoMemoryLines,
  enforceAutoMemoryLimits,
  addAutoMemoryEntry,
  removeAutoMemoryEntry,
  searchAutoMemory,
  autoMemoryTopicSlug,
  DEFAULT_AUTO_MEMORY_MAX_LINES,
  DEFAULT_AUTO_MEMORY_MAX_BYTES,
  DEFAULT_AUTO_MEMORY_INDEX_FILENAME,
  DEFAULT_AUTO_MEMORY_TOPICS_DIRNAME,
} from "../src/index.js";
import type { AutoMemoryFs } from "../src/index.js";

function makeFs(initial: Record<string, string> = {}): { fs: AutoMemoryFs; files: Map<string, string>; reads: string[] } {
  const files = new Map(Object.entries(initial));
  const reads: string[] = [];
  return {
    files,
    reads,
    fs: {
      async readFile(path: string): Promise<string> {
        reads.push(path);
        const content = files.get(path);
        if (content === undefined) throw new Error("ENOENT");
        return content;
      },
      async writeFile(path: string, content: string): Promise<void> {
        files.set(path, content);
      },
    },
  };
}

const INDEX = join("/root", "MEMORY.md");
const topicFile = (name: string): string => join("/root", "memory", `${name}.md`);

describe("auto-memory pure index ops (G6.1)", () => {
  it("parses the MEMORY.md format and roundtrips render", () => {
    const content = "# Memory\n## tooling\n- uses pnpm workspaces\n- turbo for builds\n## user\n- prefers terse replies\n";
    const sections = parseAutoMemoryIndex(content);
    expect(sections).toEqual([
      { topic: "tooling", lines: ["uses pnpm workspaces", "turbo for builds"] },
      { topic: "user", lines: ["prefers terse replies"] },
    ]);
    expect(renderAutoMemoryIndex(sections)).toBe(
      "## tooling\n- uses pnpm workspaces\n- turbo for builds\n## user\n- prefers terse replies",
    );
    expect(countAutoMemoryLines(sections)).toBe(5);
    expect(parseAutoMemoryIndex("")).toEqual([]);
    expect(countAutoMemoryLines([])).toBe(0);
  });

  it("files bullets without a topic heading under 'general' and skips empty topics", () => {
    const sections = parseAutoMemoryIndex("- orphan fact\n## empty\n## real\n- kept\n");
    expect(sections).toEqual([
      { topic: "general", lines: ["orphan fact"] },
      { topic: "empty", lines: [] },
      { topic: "real", lines: ["kept"] },
    ]);
    expect(renderAutoMemoryIndex(sections)).toBe("## general\n- orphan fact\n## real\n- kept");
  });

  it("enforces the line cap by dropping the OLDEST entries first", () => {
    const sections = [
      { topic: "a", lines: ["old-1", "old-2"] },
      { topic: "b", lines: ["new-1", "new-2"] },
    ];
    const result = enforceAutoMemoryLimits(sections, { maxLines: 3, maxBytes: 10_000 });
    expect(result.truncated).toBe(true);
    expect(countAutoMemoryLines(parseAutoMemoryIndex(result.content))).toBeLessThanOrEqual(3);
    expect(result.content).toContain("new-2");
    expect(result.content).not.toContain("old-1");
  });

  it("enforces the byte cap and reports no truncation when under budget", () => {
    const sections = [{ topic: "a", lines: ["x".repeat(50)] }];
    const capped = enforceAutoMemoryLimits(sections, { maxLines: 200, maxBytes: 30 });
    expect(capped.truncated).toBe(true);
    expect(Buffer.byteLength(capped.content, "utf8")).toBeLessThanOrEqual(30);

    const under = enforceAutoMemoryLimits(sections, { maxLines: 200, maxBytes: DEFAULT_AUTO_MEMORY_MAX_BYTES });
    expect(under.truncated).toBe(false);
    expect(under.content).toBe(renderAutoMemoryIndex(sections));
  });

  it("drops to empty when a single entry can never fit the budget", () => {
    const result = enforceAutoMemoryLimits([{ topic: "a", lines: ["monster"] }], { maxLines: 200, maxBytes: 2 });
    expect(result).toEqual({ content: "", truncated: true });
  });

  it("adds entries with dedup + trim and creates topics on demand", () => {
    const first = addAutoMemoryEntry([], "tooling", "  uses pnpm  ");
    expect(first).toEqual({ sections: [{ topic: "tooling", lines: ["uses pnpm"] }], added: true });
    const dup = addAutoMemoryEntry(first.sections, "tooling", "uses pnpm");
    expect(dup.added).toBe(false);
    expect(dup.sections[0]?.lines).toHaveLength(1);
    const empty = addAutoMemoryEntry(first.sections, "tooling", "   ");
    expect(empty.added).toBe(false);
    const second = addAutoMemoryEntry(first.sections, "tooling", "turbo");
    expect(second.sections[0]?.lines).toEqual(["uses pnpm", "turbo"]);
  });

  it("removes entries and cleans up empty topics", () => {
    const base = [{ topic: "a", lines: ["one"] }];
    const missing = removeAutoMemoryEntry(base, "a", "nope");
    expect(missing).toEqual({ sections: base, removed: false });
    const removed = removeAutoMemoryEntry(base, "a", "one");
    expect(removed).toEqual({ sections: [], removed: true });
  });

  it("searches with AND-of-terms; topic-name matches rank higher", () => {
    const sections = [
      { topic: "deploy", lines: ["uses github actions", "rollout takes 5 min"] },
      { topic: "misc", lines: ["deploy via ssh is forbidden"] },
    ];
    const matches = searchAutoMemory(sections, "deploy");
    expect(matches).toHaveLength(3);
    expect(matches[0]).toMatchObject({ topic: "deploy", score: 2 });
    expect(matches[1]).toMatchObject({ topic: "deploy", score: 2 });
    expect(matches[2]).toMatchObject({ topic: "misc", score: 1 });
    expect(searchAutoMemory(sections, "deploy ssh")).toHaveLength(1);
    expect(searchAutoMemory(sections, "deploy", 1)).toHaveLength(1);
    expect(searchAutoMemory(sections, "   ")).toEqual([]);
  });

  it("slugifies topics safely (no path traversal, empty → topic)", () => {
    expect(autoMemoryTopicSlug("My Topic!")).toBe("my-topic");
    expect(autoMemoryTopicSlug("../../evil")).toBe("evil");
    expect(autoMemoryTopicSlug("///")).toBe("topic");
  });

  it("exposes the Claude Code default caps", () => {
    expect(DEFAULT_AUTO_MEMORY_MAX_LINES).toBe(200);
    expect(DEFAULT_AUTO_MEMORY_MAX_BYTES).toBe(25 * 1024);
    expect(DEFAULT_AUTO_MEMORY_INDEX_FILENAME).toBe("MEMORY.md");
    expect(DEFAULT_AUTO_MEMORY_TOPICS_DIRNAME).toBe("memory");
    expect(typeof createNodeAutoMemoryFs).toBe("function");
  });
});

describe("AutoMemory file-backed (G6.1)", () => {
  it("loads missing index as empty and writes the titled file on save", async () => {
    const { fs, files } = makeFs();
    const memory = new AutoMemory({ rootDir: "/root" }, fs);
    await memory.load();
    expect(memory.renderBlock()).toBe("");
    await memory.add("tooling", "pnpm only");
    expect(files.get(INDEX)).toBe("# Memory\n## tooling\n- pnpm only\n");
    expect(memory.renderBlock()).toBe("## tooling\n- pnpm only");
    expect(memory.topics).toEqual(["tooling"]);
  });

  it("caps the persisted index at maxLines keeping the newest entries", async () => {
    const { fs, files } = makeFs();
    const memory = new AutoMemory({ rootDir: "/root", maxLines: 5 }, fs);
    for (let i = 1; i <= 12; i++) await memory.add("t", `fact-${i}`);
    const content = files.get(INDEX)!;
    const bodyLines = content.split("\n").filter((l) => l.length > 0);
    expect(bodyLines.length).toBeLessThanOrEqual(6); // "# Memory" + 5 capped lines
    expect(content).toContain("fact-12");
    expect(content).not.toContain("fact-1\n");
    expect(memory.renderBlock().split("\n").length).toBeLessThanOrEqual(5);
  });

  it("roundtrips a previously persisted index", async () => {
    const { fs } = makeFs({ [INDEX]: "# Memory\n## user\n- terse replies\n" });
    const memory = new AutoMemory({ rootDir: "/root" }, fs);
    await memory.load();
    expect(memory.search("terse")).toHaveLength(1);
    expect(await memory.remove("user", "terse replies")).toBe(true);
    expect(memory.renderBlock()).toBe("");
    expect(await memory.remove("user", "terse replies")).toBe(false);
  });

  it("reads topic files lazily and only on demand", async () => {
    const { fs, reads } = makeFs({ [topicFile("deploy")]: "runbook content" });
    const memory = new AutoMemory({ rootDir: "/root" }, fs);
    await memory.load();
    expect(reads).toHaveLength(1); // index only
    expect(await memory.readTopic("deploy")).toBe("runbook content");
    expect(await memory.readTopic("missing")).toBeUndefined();
    expect(reads).toHaveLength(3); // index + 2 topic lookups
  });

  it("writes topic files with the byte cap (truncation flagged)", async () => {
    const { fs, files } = makeFs();
    const memory = new AutoMemory({ rootDir: "/root", maxBytes: 10 }, fs);
    const result = await memory.writeTopic("big", "x".repeat(50));
    expect(result.truncated).toBe(true);
    expect(result.content).toHaveLength(10);
    expect(files.get(topicFile("big"))).toHaveLength(10);
    const ok = await memory.writeTopic("small", "fine");
    expect(ok).toEqual({ content: "fine", truncated: false });
    expect(await memory.readTopic("small")).toBe("fine");
    expect(autoMemoryTopicSlug("Deploy Runbook")).toBe("deploy-runbook");
  });

  it("addMany counts only newly added lines and persists once", async () => {
    const { fs, files } = makeFs();
    const memory = new AutoMemory({ rootDir: "/root" }, fs);
    const result = await memory.addMany("t", ["a", "b", "a"]);
    expect(result).toEqual({ added: 2, truncated: false });
    expect(files.get(INDEX)).toBe("# Memory\n## t\n- a\n- b\n");
    expect(memory.snapshot[0]?.lines).toEqual(["a", "b"]);
  });
});
