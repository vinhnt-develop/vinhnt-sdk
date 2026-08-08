import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ToolDefinition } from "./definitions.js";
import { z } from "zod";
import { defineTool } from "./define-tool.js";

const GlobFilesSchema = z.object({
  pattern: z.string().min(1),
  maxResults: z.number().positive().optional(),
});
const GrepFilesSchema = z.object({
  pattern: z.string().min(1),
  include: z.string().optional(),
  maxResults: z.number().positive().optional(),
});

type RootGetter = string | (() => string);

function resolveRoot(r: RootGetter): string {
  return typeof r === "function" ? r() : r;
}

/**
 * Default ignored directories for search — convenience only.
 * User tự extend: `config.ignoredDirs = [...DEFAULT_IGNORED_DIRS, "my-dir"]`
 */
export const DEFAULT_IGNORED_DIRS = ["node_modules", ".git", ".next", "dist", ".turbo", "coverage", ".vscode"];

async function globRecursive(dir: string, pattern: string, base: string, results: string[], ignoreDirs: Set<string>): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    const relPath = relative(base, fullPath);
    if (entry.name.includes(pattern) || relPath.includes(pattern)) {
      results.push(relPath);
    }
    if (entry.isDirectory()) {
      await globRecursive(fullPath, pattern, base, results, ignoreDirs);
    }
  }
}

export function createGlobFilesTool(workspaceRoot: RootGetter, ignoredDirs?: string[]): ToolDefinition {
  const ignoreSet = new Set(ignoredDirs ?? DEFAULT_IGNORED_DIRS);

  return defineTool<{ pattern: string; maxResults?: number }, string[]>({
    name: "glob_files",
    description: "Recursively find files matching a pattern in the workspace.",
    risk: "read",
    input: GlobFilesSchema,
    jsonSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "File name or path fragment to match" },
        maxResults: { type: "number", description: "Maximum results (default 50)", default: 50 },
      },
      required: ["pattern"],
    },
    async execute(v, _ctx) {
      const root = resolveRoot(workspaceRoot);
      const results: string[] = [];
      await globRecursive(root, v.pattern, root, results, ignoreSet);
      return results.slice(0, v.maxResults ?? 50);
    },
  }).toDefinition();
}

export function createGrepFilesTool(workspaceRoot: RootGetter, ignoredDirs?: string[]): ToolDefinition {
  const ignoreSet = new Set(ignoredDirs ?? DEFAULT_IGNORED_DIRS);

  return defineTool<{ pattern: string; include?: string; maxResults?: number }, { file: string; line: number; content: string }[]>({
    name: "grep_files",
    description: "Search file contents for a regex pattern. Returns matches with line numbers.",
    risk: "read",
    input: GrepFilesSchema,
    jsonSchema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex pattern to search" },
        include: { type: "string", description: "File pattern filter (e.g. *.ts, *.md)" },
        maxResults: { type: "number", description: "Maximum match lines (default 30)", default: 30 },
      },
      required: ["pattern"],
    },
    async execute(v, _ctx) {
      const root = resolveRoot(workspaceRoot);
      const maxResults = v.maxResults ?? 30;
      const regex = new RegExp(v.pattern);
      const matches: { file: string; line: number; content: string }[] = [];

      async function searchDir(dir: string): Promise<void> {
        if (matches.length >= maxResults) return;
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (matches.length >= maxResults) return;
          if (ignoreSet.has(entry.name)) continue;
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            await searchDir(fullPath);
          } else if (
            !v.include || entry.name.endsWith(v.include.replace("*", ""))
          ) {
            try {
              const st = await stat(fullPath);
              if (st.size > 100_000) continue;
              const content = await readFile(fullPath, "utf-8");
              const lines = content.split("\n");
              for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i]!)) {
                  matches.push({
                    file: relative(root, fullPath),
                    line: i + 1,
                    content: lines[i]!.trim().slice(0, 200),
                  });
                  if (matches.length >= maxResults) return;
                }
              }
            } catch {
              continue;
            }
          }
        }
      }

      await searchDir(root);
      return matches;
    },
  }).toDefinition();
}
