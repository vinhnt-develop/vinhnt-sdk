import { readFile, writeFile, readdir, stat, mkdir } from "node:fs/promises";
import { join, relative, resolve, sep, dirname } from "node:path";
import type { ToolContext } from "./definitions.js";
import { FileReadTracker } from "./read-tracker.js";
import { generateDiff } from "./diff.js";
import { z } from "zod";
import { defineTool } from "./define-tool.js";
import { sanitizeForLLM } from "../security/input-sanitizer.js";

const filePathField = z.string().min(1);

const ReadFileSchema = z.object({
  filePath: filePathField,
  stripTrailingNewline: z.boolean().optional().default(false),
});
const WriteFileSchema = z.object({
  filePath: filePathField,
  content: z.string(),
});
const EditBlockSchema = z.object({
  oldString: z.string().min(1, "oldString is required"),
  newString: z.string(),
});
const EditFileSchema = z.object({
  filePath: filePathField,
  oldString: z.string().min(1).optional(),
  newString: z.string().optional(),
  edits: z.array(EditBlockSchema).min(1).optional(),
}).refine(
  (data) => (data.oldString !== undefined && data.newString !== undefined) || (data.edits !== undefined),
  { message: "Either oldString+newString or edits array is required" },
);
const ApplyPatchSchema = z.object({
  filePath: filePathField,
  patch: z.string().min(1),
});
const ListDirectorySchema = z.object({
  dirPath: z.string().min(1),
});

const READ_FILE_SCHEMA = {
  type: "object" as const,
  properties: {
    filePath: { type: "string" as const, description: "Path relative to workspace root (or use 'path' alias)" },
    path: { type: "string" as const, description: "Alias for filePath" },
    stripTrailingNewline: { type: "boolean" as const, description: "If true, strip trailing newline", default: false },
  },
};

const WRITE_FILE_SCHEMA = {
  type: "object" as const,
  properties: {
    filePath: { type: "string" as const, description: "Path relative to workspace root (or use 'path' alias)" },
    path: { type: "string" as const, description: "Alias for filePath" },
    content: { type: "string" as const, description: "File content to write" },
  },
};

const EDIT_FILE_SCHEMA = {
  type: "object" as const,
  properties: {
    filePath: { type: "string" as const, description: "Path relative to workspace root (or use 'path' alias)" },
    path: { type: "string" as const, description: "Alias for filePath" },
    oldString: { type: "string" as const, description: "Text to search for (supports fuzzy matching). Required unless edits is provided." },
    newString: { type: "string" as const, description: "Replacement text. Required unless edits is provided." },
    edits: { type: "array" as const, items: { type: "object" as const, properties: { oldString: { type: "string" as const }, newString: { type: "string" as const } }, required: ["oldString", "newString"] }, description: "Array of search-replace blocks for multi-hunk edits" },
  },
};

const APPLY_PATCH_SCHEMA = {
  type: "object" as const,
  properties: {
    filePath: { type: "string" as const, description: "Path relative to workspace root (or use 'path' alias)" },
    path: { type: "string" as const, description: "Alias for filePath" },
    patch: { type: "string" as const, description: "Search/replace patch with one or more SEARCH/REPLACE blocks" },
  },
  required: ["patch"],
};

const LIST_DIRECTORY_SCHEMA = {
  type: "object" as const,
  properties: {
    dirPath: { type: "string" as const, description: "Directory path relative to workspace root (or use 'path' alias)" },
    path: { type: "string" as const, description: "Alias for dirPath" },
  },
};

type RootGetter = string | (() => string);

function resolveRoot(r: RootGetter): string {
  return typeof r === "function" ? r() : r;
}

const DEFAULT_MAX_FILE_SIZE = 1_048_576;

function isWithinWorkspace(target: string, workspace: string): boolean {
  const rel = relative(workspace, resolve(target));
  if (rel === "") return true;
  return !rel.startsWith("..") && !rel.split(sep).includes("..");
}

async function ensurePathAccess(target: string, root: string, pathLabel: string, ctx: ToolContext, externalDirAccess?: boolean): Promise<void> {
  if (isWithinWorkspace(target, root)) return;
  if (externalDirAccess) return;
  const reply = await ctx.ask({
    permission: "external_directory_access",
    resource: target,
    reason: `Access path outside workspace: ${pathLabel}`,
  });
  if (reply === "reject") {
    throw new Error(`Path "${pathLabel}" is outside workspace — access rejected`);
  }
}

function normalizeInput(input: unknown): Record<string, unknown> {
  const v = input as Record<string, unknown> | null | undefined;
  if (!v || typeof v !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(v)) {
    result[key] = value;
  }
  if (!v.filePath && v.path && typeof v.path === "string") {
    result.filePath = v.path;
  }
  if (!v.dirPath && v.path && typeof v.path === "string") {
    result.dirPath = v.path;
  }
  if (!v.oldString && v.old_content && typeof v.old_content === "string") {
    result.oldString = v.old_content;
  }
  if (!v.newString && v.new_content && typeof v.new_content === "string") {
    result.newString = v.new_content;
  }
  return result;
}

export function createReadFileTool(workspaceRoot: RootGetter, tracker?: FileReadTracker, externalDirAccess?: boolean, maxFileSize?: number) {
  return defineTool<{ filePath: string; stripTrailingNewline?: boolean }, string>({
    name: "read_file",
    description: "Read the contents of a file from the workspace.",
    risk: "read",
    input: ReadFileSchema,
    jsonSchema: READ_FILE_SCHEMA,
    normalize: normalizeInput,
    async execute(v, ctx) {
      const root = resolveRoot(workspaceRoot);
      const target = resolve(root, v.filePath);
      await ensurePathAccess(target, root, v.filePath, ctx, externalDirAccess);
      const st = await stat(target);
      const mfs = maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
      if (st.size > mfs) {
        throw new Error(`File too large (${st.size} bytes). Max: ${mfs} bytes`);
      }
      tracker?.trackRead(target, st.mtimeMs);
      const content = await readFile(target, "utf-8");
      const result = v.stripTrailingNewline ? content.replace(/\n$/, "") : content;
      return sanitizeForLLM(result, "read_file");
    },
  }).toDefinition();
}

export function createWriteFileTool(workspaceRoot: RootGetter, tracker?: FileReadTracker, externalDirAccess?: boolean) {
  return defineTool<{ filePath: string; content: string }, {
    written: string; bytes: number;
    diff: ReturnType<typeof generateDiff>["diff"];
    additions: number; removals: number;
  }>({
    name: "write_file",
    description: "Write content to a file (creates parents dirs if needed). Overwrites existing content.",
    risk: "write",
    input: WriteFileSchema,
    jsonSchema: WRITE_FILE_SCHEMA,
    normalize: normalizeInput,
    async execute(v, ctx) {
      const root = resolveRoot(workspaceRoot);
      const target = resolve(root, v.filePath);
      await ensurePathAccess(target, root, v.filePath, ctx, externalDirAccess);
      await tracker?.assertWasRead(target);
      await mkdir(dirname(target), { recursive: true });
      const oldContent = await readFile(target, "utf-8").catch(() => "");
      ctx.setCompensation(async () => {
        if (oldContent) {
          await writeFile(target, oldContent, "utf-8");
        } else {
          const { rm } = await import("node:fs/promises");
          await rm(target, { force: true });
        }
      });
      await writeFile(target, v.content, "utf-8");
      const diff = generateDiff(v.filePath, oldContent, v.content);
      return { written: v.filePath, bytes: v.content.length, diff: diff.diff, additions: diff.additions, removals: diff.removals };
    },
  }).toDefinition();
}

function charSimilarity(a: string, b: string): number {
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length < b.length ? a : b;
  if (longer.length === 0) return 1;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter.charAt(i) === longer.charAt(i)) matches++;
  }
  const diffs = longer.length - matches;
  return 1 - diffs / longer.length;
}

function findBestMatch(content: string, oldString: string): { index: number; ratio: number } | undefined {
  const lines = content.split("\n");
  const oldLines = oldString.split("\n");
  const windowLen = oldLines.length;
  if (windowLen === 0 || lines.length < windowLen) return undefined;

  let bestIdx = -1;
  let bestRatio = 0;

  for (let i = 0; i <= lines.length - windowLen; i++) {
    const window = lines.slice(i, i + windowLen).join("\n");
    const ratio = charSimilarity(window, oldString);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestIdx = i;
    }
  }

  if (bestRatio > 0.4) {
    const index = lines.slice(0, bestIdx).join("\n").length + (bestIdx > 0 ? 1 : 0);
    return { index, ratio: bestRatio };
  }
  return undefined;
}

/** Tokenize into words and non-word separators */
function tokenize(s: string): string[] {
  return s.split(/(\s+)/).filter(Boolean);
}

/** Token-level similarity ratio */
function tokenSimilarity(a: string, b: string): number {
  const aTok = tokenize(a);
  const bTok = tokenize(b);
  if (aTok.length === 0 && bTok.length === 0) return 1;
  let matches = 0;
  const limit = Math.min(aTok.length, bTok.length);
  for (let i = 0; i < limit; i++) {
    if (aTok[i] === bTok[i]) matches++;
  }
  const total = Math.max(aTok.length, bTok.length);
  return matches / total;
}

interface FindResult {
  start: number;
  end: number;
  ratio: number;
  layer: number;
}

function findMatchMultiLayer(content: string, oldString: string): FindResult | undefined {
  const layers: Array<{ name: string; fn: (c: string, o: string) => { start: number; end: number } | undefined }> = [
    { name: "exact", fn: (c, o) => {
      const idx = c.indexOf(o);
      return idx >= 0 ? { start: idx, end: idx + o.length } : undefined;
    }},
    { name: "trimmed", fn: (c, o) => {
      const trimmed = o.split("\n").map((l) => l.trim()).join("\n");
      const idx = c.indexOf(trimmed);
      return idx >= 0 ? { start: idx, end: idx + trimmed.length } : undefined;
    }},
    { name: "indent-agnostic", fn: (c, o) => {
      const strip = (s: string) => s.replace(/^[ \t]+/gm, "").replace(/\r\n/g, "\n");
      const tLines = strip(o).split("\n");
      const cLines = strip(c).split("\n");
      if (tLines.length < 1 || tLines.length > cLines.length) return undefined;
      for (let i = 0; i <= cLines.length - tLines.length; i++) {
        let match = true;
        for (let j = 0; j < tLines.length; j++) {
          if (cLines[i + j] !== tLines[j]) { match = false; break; }
        }
        if (match) {
          const origLines = c.split("\n");
          const beforeLen = origLines.slice(0, i).join("\n").length;
          const start = beforeLen + (i > 0 ? 1 : 0);
          const end = origLines.slice(0, i + tLines.length).join("\n").length;
          return { start, end };
        }
      }
      return undefined;
    }},
    { name: "fuzzy", fn: (c, o) => {
      const fb = findBestMatch(c, o);
      return fb ? { start: fb.index, end: fb.index + o.length } : undefined;
    }},
    { name: "case-insensitive", fn: (c, o) => {
      const lower = o.toLowerCase();
      const idx = c.toLowerCase().indexOf(lower);
      if (idx < 0) return undefined;
      // Find the actual match boundaries in original content
      const end = idx + o.length;
      // Validate we're not cutting a multi-byte char
      if (end > c.length) return undefined;
      return { start: idx, end };
    }},
    { name: "normalized-whitespace", fn: (c, o) => {
      const norm = (s: string) => s.replace(/\s+/g, " ").trim();
      const cn = norm(c);
      const on = norm(o);
      if (on.length < 5) return undefined;
      const idx = cn.indexOf(on);
      if (idx < 0) return undefined;
      // Map normalized position back to original content
      const mapToOrig = (normPos: number): number => {
        let i = 0, ni = 0;
        while (i < c.length && ni < normPos) {
          if (c[i] === " " || c[i] === "\n" || c[i] === "\t") {
            i++;
            while (i < c.length && (c[i] === " " || c[i] === "\n" || c[i] === "\t")) i++;
            ni++;
          } else {
            i++; ni++;
          }
        }
        return i;
      };
      const start = mapToOrig(idx);
      const end = mapToOrig(idx + on.length);
      if (end - start < 3) return undefined;
      return { start, end };
    }},
    { name: "token-fuzzy", fn: (c, o) => {
      const lines = c.split("\n");
      const oldLines = o.split("\n");
      const windowLen = oldLines.length;
      if (windowLen < 1 || lines.length < windowLen) return undefined;
      let bestIdx = -1;
      let bestRatio = 0;
      for (let i = 0; i <= lines.length - windowLen; i++) {
        const window = lines.slice(i, i + windowLen).join("\n");
        const ratio = tokenSimilarity(window, o);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestIdx = i;
        }
      }
      if (bestRatio > 0.5) {
        const start = lines.slice(0, bestIdx).join("\n").length + (bestIdx > 0 ? 1 : 0);
        const end = lines.slice(0, bestIdx + windowLen).join("\n").length;
        return { start, end };
      }
      return undefined;
    }},
    { name: "context-recovery", fn: (c, o) => {
      // Try to find key phrases (longest non-whitespace parts) individually,
      // then reconstruct the span covering all found parts
      const phrases = o.split(/\s+/).filter((p) => p.length > 3 && p.length < 50);
      if (phrases.length < 2) return undefined;
      const positions: number[] = [];
      const cLower = c.toLowerCase();
      for (const phrase of phrases) {
        const idx = cLower.indexOf(phrase.toLowerCase());
        if (idx >= 0) positions.push(idx);
      }
      if (positions.length < 2) return undefined;
      const startPos = Math.min(...positions);
      const endPos = Math.max(...positions) + o.length;
      // Verify the span is reasonable
      if (endPos - startPos > o.length * 2.5) return undefined;
      return { start: startPos, end: Math.min(endPos, c.length) };
    }},
  ];

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]!;
    const result = layer.fn(content, oldString);
    if (result) {
      // For layers 5+, verify the match is reasonable
      if (i >= 4) {
        const matched = content.slice(result.start, result.end);
        // Use normalized comparison for whitespace-agnostic layers
        const norm = (s: string) => s.replace(/\s+/g, " ").trim();
        const mNorm = layer.name === "normalized-whitespace" ? norm(matched) : matched;
        const oNorm = layer.name === "normalized-whitespace" ? norm(oldString) : oldString;
        const ratio = charSimilarity(mNorm, oNorm);
        if (ratio < 0.3) continue;
        return { ...result, ratio, layer: i + 1 };
      }
      return { ...result, ratio: 1, layer: i + 1 };
    }
  }
  return undefined;
}

function applySingleEdit(
  filePath: string, content: string, oldString: string, newString: string,
): { newContent: string; diff: ReturnType<typeof generateDiff> } {
  const result = findMatchMultiLayer(content, oldString);
  if (!result) {
    const snippet = content.length > 400 ? content.slice(0, 200) + "\n...\n" + content.slice(-200) : content;
    let msg = `oldString not found in ${filePath}. Content (${content.length} chars):\n---\n${snippet}\n---\n`;
    const fuzzyTry = findBestMatch(content, oldString);
    if (fuzzyTry) {
      const matchSnippet = content.slice(fuzzyTry.index, fuzzyTry.index + Math.min(200, oldString.length));
      msg += `Closest match (${Math.round(fuzzyTry.ratio * 100)}% character similarity) at position ${fuzzyTry.index}:\n---\n${matchSnippet}\n---\n`;
    }
    throw new Error(msg);
  }

  if (result.layer === 1) {
    const first = content.indexOf(oldString);
    const last = content.lastIndexOf(oldString);
    if (first !== last) {
      const count = content.split(oldString).length - 1;
      throw new Error(`oldString found ${count} times in ${filePath} — replace must match exactly once`);
    }
  }

  const newContent = content.slice(0, result.start) + newString + content.slice(result.end);
  return { newContent, diff: generateDiff(filePath, content, newContent) };
}

function applyMultiEdit(
  filePath: string, content: string, edits: readonly { oldString: string; newString: string }[],
): { newContent: string; diffs: ReturnType<typeof generateDiff>[] } {
  let current = content;
  const diffs: ReturnType<typeof generateDiff>[] = [];
  for (const edit of edits) {
    const result = applySingleEdit(filePath, current, edit.oldString, edit.newString);
    current = result.newContent;
    diffs.push(result.diff);
  }
  return { newContent: current, diffs };
}

export function createEditFileTool(workspaceRoot: RootGetter, tracker?: FileReadTracker, externalDirAccess?: boolean) {
  return defineTool<{ filePath: string; oldString?: string; newString?: string; edits?: readonly { oldString: string; newString: string }[] }, {
    edited: string; diff: string;
    hunkCount?: number; additions: number; removals: number;
  }>({
    name: "edit_file",
    description: "Apply search-and-replace edits to an existing file. Supports exact and fuzzy matching (9 layers). Pass edits[] for multiple edits in one call.",
    risk: "write",
    input: EditFileSchema,
    jsonSchema: EDIT_FILE_SCHEMA,
    normalize: normalizeInput,
    async execute(v, ctx) {
      const root = resolveRoot(workspaceRoot);
      const target = resolve(root, v.filePath);
      await ensurePathAccess(target, root, v.filePath, ctx, externalDirAccess);
      await tracker?.assertWasRead(target);
      const content = await readFile(target, "utf-8");

      if (v.edits && v.edits.length > 0) {
        const result = applyMultiEdit(v.filePath, content, v.edits);
        ctx.setCompensation(async () => {
          await writeFile(target, content, "utf-8");
        });
        await writeFile(target, result.newContent, "utf-8");
        const totalAdditions = result.diffs.reduce((s, d) => s + d.additions, 0);
        const totalRemovals = result.diffs.reduce((s, d) => s + d.removals, 0);
        const combinedDiff = result.diffs.map((d) => d.diff).join("\n");
        return {
          edited: v.filePath, diff: combinedDiff,
          hunkCount: result.diffs.length,
          additions: totalAdditions, removals: totalRemovals,
        };
      }

      const result = applySingleEdit(v.filePath, content, v.oldString!, v.newString!);
      ctx.setCompensation(async () => {
        await writeFile(target, content, "utf-8");
      });
      await writeFile(target, result.newContent, "utf-8");
      return { edited: v.filePath, diff: result.diff.diff, additions: result.diff.additions, removals: result.diff.removals };
    },
  }).toDefinition();
}

function parsePatch(patch: string): { oldString: string; newString: string }[] {
  const blocks: { oldString: string; newString: string }[] = [];
  const regex = /<<<<<<< SEARCH\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>>\n?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(patch)) !== null) {
    blocks.push({ oldString: match[1]!, newString: match[2]! });
  }
  if (blocks.length === 0) {
    throw new Error("No valid search/replace blocks found in patch");
  }
  return blocks;
}

export function createApplyPatchTool(workspaceRoot: RootGetter, tracker?: FileReadTracker, externalDirAccess?: boolean) {
  return defineTool<{ filePath: string; patch: string }, {
    patched: string; blocks: number; diff: string; additions: number; removals: number;
  }>({
    name: "apply_patch",
    description: "Apply a search/replace patch to an existing file. The patch must contain one or more search/replace blocks in the format: <<<<<<< SEARCH followed by the exact text to find, then =======, then the replacement text, then >>>>>>>. Each search string must match exactly once in the file.",
    risk: "write",
    input: ApplyPatchSchema,
    jsonSchema: APPLY_PATCH_SCHEMA,
    normalize: normalizeInput,
    async execute(v, ctx) {
      const root = resolveRoot(workspaceRoot);
      const target = resolve(root, v.filePath);
      await ensurePathAccess(target, root, v.filePath, ctx, externalDirAccess);
      await tracker?.assertWasRead(target);
      const oldContent = await readFile(target, "utf-8");
      const blocks = parsePatch(v.patch);
      let content = oldContent;
      const totalAdditions: number[] = [];
      const totalRemovals: number[] = [];

      for (const block of blocks) {
        if (!content.includes(block.oldString)) {
          const snippet = content.length > 400 ? content.slice(0, 200) + "\n...\n" + content.slice(-200) : content;
          throw new Error(
            `Search string not found in ${v.filePath} (${content.length} chars). ` +
            `File content:\n---\n${snippet}\n---\n` +
            `Searched for:\n---\n${block.oldString.slice(0, 200)}${block.oldString.length > 200 ? "..." : ""}\n---`
          );
        }
        const firstIdx = content.indexOf(block.oldString);
        const lastIdx = content.lastIndexOf(block.oldString);
        if (firstIdx !== lastIdx) {
          const count = content.split(block.oldString).length - 1;
          throw new Error(`Search string found ${count} times in ${v.filePath} — each block must match exactly once`);
        }
        const newContent = content.replace(block.oldString, block.newString);
        content = newContent;
        totalAdditions.push(block.newString.length);
        totalRemovals.push(block.oldString.length);
      }

      ctx.setCompensation(async () => {
        await writeFile(target, oldContent, "utf-8");
      });
      await writeFile(target, content, "utf-8");
      const diff = generateDiff(v.filePath, oldContent, content);
      return {
        patched: v.filePath,
        blocks: blocks.length,
        diff: diff.diff,
        additions: totalAdditions.reduce((a, b) => a + b, 0),
        removals: totalRemovals.reduce((a, b) => a + b, 0),
      };
    },
  }).toDefinition();
}

export function createListDirectoryTool(workspaceRoot: RootGetter, externalDirAccess?: boolean) {
  return defineTool<{ dirPath: string }, { name: string; type: string; path: string }[]>({
    name: "list_directory",
    description: "List files and directories in a path (non-recursive). Skips node_modules and .git.",
    risk: "read",
    input: ListDirectorySchema,
    jsonSchema: LIST_DIRECTORY_SCHEMA,
    normalize: normalizeInput,
    async execute(v, ctx) {
      const root = resolveRoot(workspaceRoot);
      const target = resolve(root, v.dirPath);
      await ensurePathAccess(target, root, v.dirPath, ctx, externalDirAccess);
      const entries = await readdir(target, { withFileTypes: true });
      return entries
        .filter((e) => e.name !== "node_modules" && e.name !== ".git")
        .map((e) => ({
          name: e.name,
          type: e.isDirectory() ? "directory" : "file",
          path: join(v.dirPath, e.name),
        }));
    },
  }).toDefinition();
}
