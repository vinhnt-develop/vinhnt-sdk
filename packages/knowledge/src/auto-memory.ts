import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

/** Default cap for the MEMORY.md index — Claude Code auto-memory parity (200 lines). */
export const DEFAULT_AUTO_MEMORY_MAX_LINES = 200;
/** Default byte cap for the MEMORY.md index — Claude Code auto-memory parity (25 KB). */
export const DEFAULT_AUTO_MEMORY_MAX_BYTES = 25 * 1024;
export const DEFAULT_AUTO_MEMORY_INDEX_FILENAME = "MEMORY.md";
export const DEFAULT_AUTO_MEMORY_TOPICS_DIRNAME = "memory";

export interface AutoMemorySection {
  readonly topic: string;
  readonly lines: string[];
}

export interface AutoMemoryLimits {
  readonly maxLines: number;
  readonly maxBytes: number;
}

export interface AutoMemoryRenderResult {
  readonly content: string;
  readonly truncated: boolean;
}

export interface AutoMemoryMatch {
  readonly topic: string;
  readonly line: string;
  /** Higher = better (topic-name matches rank above line-body matches). */
  readonly score: number;
}

export interface AutoMemoryConfig {
  /** Directory that holds `MEMORY.md` and the lazy topic files (injected — never hardcoded). */
  readonly rootDir: string;
  readonly indexPath?: string;
  readonly topicsDir?: string;
  readonly maxLines?: number;
  readonly maxBytes?: number;
}

export interface AutoMemoryFs {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
}

/** Minimal fs seam so tests (and non-node hosts) can swap the backing store. */
export function createNodeAutoMemoryFs(): AutoMemoryFs {
  return {
    async readFile(path: string): Promise<string> {
      return readFile(path, "utf8");
    },
    async writeFile(path: string, content: string): Promise<void> {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, "utf8");
    },
  };
}

// === Pure index operations (no I/O) ===

export function parseAutoMemoryIndex(content: string): AutoMemorySection[] {
  const sections: AutoMemorySection[] = [];
  let current: AutoMemorySection | undefined;
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (line.length === 0 || line === "# Memory") continue;
    if (line.startsWith("## ")) {
      const topic = line.slice(3).trim();
      if (topic.length > 0) {
        current = { topic, lines: [] };
        sections.push(current);
      }
      continue;
    }
    if (line.startsWith("- ")) {
      const text = line.slice(2).trim();
      if (text.length > 0) {
        if (current === undefined) {
          current = { topic: "general", lines: [] };
          sections.push(current);
        }
        current.lines.push(text);
      }
      continue;
    }
    if (current === undefined) {
      current = { topic: "general", lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  }
  return sections;
}

export function renderAutoMemoryIndex(sections: readonly AutoMemorySection[]): string {
  const parts: string[] = [];
  for (const section of sections) {
    if (section.lines.length === 0) continue;
    parts.push(`## ${section.topic}`);
    for (const line of section.lines) parts.push(`- ${line}`);
  }
  return parts.join("\n");
}

export function countAutoMemoryLines(sections: readonly AutoMemorySection[]): number {
  let count = 0;
  for (const section of sections) {
    if (section.lines.length === 0) continue;
    count += 1 + section.lines.length;
  }
  return count;
}

/**
 * Enforce the line/byte budget by dropping the OLDEST entries first
 * (render order = append order across topics). Newest learnings survive.
 */
export function enforceAutoMemoryLimits(
  sections: readonly AutoMemorySection[],
  limits: AutoMemoryLimits,
): AutoMemoryRenderResult {
  const working: AutoMemorySection[] = sections.map((s) => ({ topic: s.topic, lines: [...s.lines] }));
  const over = (content: string): boolean =>
    countAutoMemoryLines(working) > limits.maxLines || Buffer.byteLength(content, "utf8") > limits.maxBytes;

  let content = renderAutoMemoryIndex(working);
  let truncated = false;
  while (over(content) && working.some((s) => s.lines.length > 0)) {
    truncated = true;
    const first = working.find((s) => s.lines.length > 0)!;
    first.lines.shift();
    if (first.lines.length === 0) working.splice(working.indexOf(first), 1);
    content = renderAutoMemoryIndex(working);
  }
  if (over(content)) {
    // Nothing removable left (or a single monster entry still over budget) → drop to empty.
    truncated = true;
    content = "";
  }
  return { content, truncated };
}

/** Add one line to a topic (exact duplicates within the topic are ignored). */
export function addAutoMemoryEntry(
  sections: readonly AutoMemorySection[],
  topic: string,
  line: string,
): { sections: AutoMemorySection[]; added: boolean } {
  const text = line.trim();
  const working: AutoMemorySection[] = sections.map((s) => ({ topic: s.topic, lines: [...s.lines] }));
  if (text.length === 0) return { sections: working, added: false };
  let section = working.find((s) => s.topic === topic);
  if (section === undefined) {
    section = { topic, lines: [] };
    working.push(section);
  }
  if (section.lines.includes(text)) return { sections: working, added: false };
  section.lines.push(text);
  return { sections: working, added: true };
}

export function removeAutoMemoryEntry(
  sections: readonly AutoMemorySection[],
  topic: string,
  line: string,
): { sections: AutoMemorySection[]; removed: boolean } {
  const working: AutoMemorySection[] = sections.map((s) => ({ topic: s.topic, lines: [...s.lines] }));
  const section = working.find((s) => s.topic === topic);
  if (section === undefined) return { sections: working, removed: false };
  const index = section.lines.indexOf(line.trim());
  if (index < 0) return { sections: working, removed: false };
  section.lines.splice(index, 1);
  if (section.lines.length === 0) working.splice(working.indexOf(section), 1);
  return { sections: working, removed: true };
}

/** Case-insensitive AND-of-terms keyword search over topic names + line bodies. */
export function searchAutoMemory(
  sections: readonly AutoMemorySection[],
  query: string,
  limit = 10,
): AutoMemoryMatch[] {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
  if (terms.length === 0) return [];
  const matches: AutoMemoryMatch[] = [];
  for (const section of sections) {
    const topicLower = section.topic.toLowerCase();
    for (const line of section.lines) {
      const haystack = `${topicLower} ${line.toLowerCase()}`;
      if (!terms.every((t) => haystack.includes(t))) continue;
      matches.push({ topic: section.topic, line, score: terms.every((t) => topicLower.includes(t)) ? 2 : 1 });
    }
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}

/** Filesystem-safe topic slug (prevents path traversal in topic file names). */
export function autoMemoryTopicSlug(topic: string): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "topic";
}

// === File-backed auto-memory ===

/**
 * Claude Code style auto-memory: an agent-written `MEMORY.md` index capped at
 * 200 lines / 25 KB, plus lazy per-topic detail files under `memory/`.
 * Writes are append-only with exact-duplicate suppression; the cap drops
 * oldest entries first so recent learnings survive.
 */
export class AutoMemory {
  private readonly config: Required<Pick<AutoMemoryConfig, "indexPath" | "topicsDir" | "maxLines" | "maxBytes">>;
  private readonly fs: AutoMemoryFs;
  private sections: AutoMemorySection[] = [];

  constructor(config: AutoMemoryConfig, fs?: AutoMemoryFs) {
    this.config = {
      indexPath: config.indexPath ?? join(config.rootDir, DEFAULT_AUTO_MEMORY_INDEX_FILENAME),
      topicsDir: config.topicsDir ?? join(config.rootDir, DEFAULT_AUTO_MEMORY_TOPICS_DIRNAME),
      maxLines: config.maxLines ?? DEFAULT_AUTO_MEMORY_MAX_LINES,
      maxBytes: config.maxBytes ?? DEFAULT_AUTO_MEMORY_MAX_BYTES,
    };
    this.fs = fs ?? createNodeAutoMemoryFs();
  }

  get limits(): AutoMemoryLimits {
    return { maxLines: this.config.maxLines, maxBytes: this.config.maxBytes };
  }

  get topics(): readonly string[] {
    return this.sections.map((s) => s.topic);
  }

  get snapshot(): readonly AutoMemorySection[] {
    return this.sections.map((s) => ({ topic: s.topic, lines: [...s.lines] }));
  }

  async load(): Promise<this> {
    try {
      this.sections = parseAutoMemoryIndex(await this.fs.readFile(this.config.indexPath));
    } catch {
      this.sections = [];
    }
    return this;
  }

  async save(): Promise<AutoMemoryRenderResult> {
    const result = enforceAutoMemoryLimits(this.sections, this.limits);
    this.sections = parseAutoMemoryIndex(result.content);
    await this.fs.writeFile(this.config.indexPath, result.content.length > 0 ? `# Memory\n${result.content}\n` : "");
    return result;
  }

  async add(topic: string, line: string): Promise<{ added: boolean; content: string; truncated: boolean }> {
    const add = addAutoMemoryEntry(this.sections, topic, line);
    this.sections = add.sections;
    const saved = await this.save();
    return { added: add.added, content: saved.content, truncated: saved.truncated };
  }

  async addMany(topic: string, lines: readonly string[]): Promise<{ added: number; truncated: boolean }> {
    let added = 0;
    for (const line of lines) {
      const result = addAutoMemoryEntry(this.sections, topic, line);
      this.sections = result.sections;
      if (result.added) added += 1;
    }
    const saved = await this.save();
    return { added, truncated: saved.truncated };
  }

  async remove(topic: string, line: string): Promise<boolean> {
    const result = removeAutoMemoryEntry(this.sections, topic, line);
    this.sections = result.sections;
    if (result.removed) await this.save();
    return result.removed;
  }

  /** Rendered index for the system prompt (no `# Memory` file title). Empty string when no memory. */
  renderBlock(): string {
    return renderAutoMemoryIndex(this.sections);
  }

  search(query: string, limit?: number): AutoMemoryMatch[] {
    return searchAutoMemory(this.sections, query, limit);
  }

  /** Lazy topic detail file — read only when the agent asks for it. */
  async readTopic(topic: string): Promise<string | undefined> {
    try {
      return await this.fs.readFile(this.topicPath(topic));
    } catch {
      return undefined;
    }
  }

  /** Write/overwrite a topic detail file (byte-capped, never returns the raw over-budget content). */
  async writeTopic(topic: string, content: string): Promise<{ content: string; truncated: boolean }> {
    let final = content;
    let truncated = false;
    if (Buffer.byteLength(final, "utf8") > this.config.maxBytes) {
      truncated = true;
      final = Buffer.from(final, "utf8").subarray(0, this.config.maxBytes).toString("utf8");
    }
    await this.fs.writeFile(this.topicPath(topic), final);
    return { content: final, truncated };
  }

  private topicPath(topic: string): string {
    return join(this.config.topicsDir, `${autoMemoryTopicSlug(topic)}.md`);
  }
}
