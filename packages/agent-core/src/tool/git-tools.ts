import { execFile } from "node:child_process";
import type { ToolDefinition } from "./definitions.js";
import { z } from "zod";
import { defineTool } from "./define-tool.js";

const GitStatusSchema = z.object({});
const GitDiffSchema = z.object({
  staged: z.boolean().optional(),
});
const GitLogSchema = z.object({
  maxCount: z.number().positive().optional(),
  path: z.string().optional(),
});
const GitCommitSchema = z.object({
  message: z.string().min(1),
});

type RootGetter = string | (() => string);

function resolveRoot(r: RootGetter): string {
  return typeof r === "function" ? r() : r;
}

function gitAsync(args: string[], cwd: string, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile("git", args, { cwd, encoding: "utf-8" as const, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout) => {
        if (err && (err as NodeJS.ErrnoException).code === "ENOENT") {
          reject(new Error("git not found"));
          return;
        }
        resolve(stdout ?? "");
      },
    );
    if (signal) {
      if (signal.aborted) { child.kill(); reject(new DOMException("Aborted", "AbortError")); return; }
      signal.addEventListener("abort", () => { child.kill(); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
    }
  });
}

export function createGitStatusTool(workspaceRoot: RootGetter): ToolDefinition {
  return defineTool<{}, { branch: string; status: string }>({
    name: "git_status",
    description: "Show working tree status (git status --short + branch info).",
    risk: "read",
    input: GitStatusSchema,
    async execute(_v, ctx) {
      const root = resolveRoot(workspaceRoot);
      const branch = (await gitAsync(["rev-parse", "--abbrev-ref", "HEAD"], root, ctx.signal)).trim();
      const status = (await gitAsync(["status", "--short"], root, ctx.signal)).trim();
      return { branch, status: status || "(clean)" };
    },
  }).toDefinition();
}

export function createGitDiffTool(workspaceRoot: RootGetter): ToolDefinition {
  return defineTool<{ staged?: boolean }, { diff: string }>({
    name: "git_diff",
    description: "Show unstaged diff (git diff) or staged diff (--staged).",
    risk: "read",
    input: GitDiffSchema,
    jsonSchema: {
      type: "object",
      properties: {
        staged: { type: "boolean", description: "Show staged diff instead of unstaged", default: false },
      },
    },
    async execute(v, ctx) {
      const root = resolveRoot(workspaceRoot);
      const args = ["diff"];
      if (v.staged) args.push("--staged");
      const output = await gitAsync(args, root, ctx.signal);
      return { diff: output || "(no diff)" };
    },
  }).toDefinition();
}

export function createGitLogTool(workspaceRoot: RootGetter): ToolDefinition {
  return defineTool<{ maxCount?: number; path?: string }, { commits: string[] }>({
    name: "git_log",
    description: "Show recent commit log (last 20 commits).",
    risk: "read",
    input: GitLogSchema,
    jsonSchema: {
      type: "object",
      properties: {
        maxCount: { type: "number", description: "Number of commits (default 10)", default: 10 },
      },
    },
    async execute(v, ctx) {
      const root = resolveRoot(workspaceRoot);
      const count = Math.min(v.maxCount ?? 10, 50);
      const log = await gitAsync(["log", `--max-count=${count}`, "--oneline"], root, ctx.signal);
      return { commits: log.trim().split("\n").filter(Boolean) };
    },
  }).toDefinition();
}

export function createGitCommitTool(workspaceRoot: RootGetter): ToolDefinition {
  return defineTool<{ message: string }, { result: string }>({
    name: "git_commit",
    description: "Stage all changed files and create a commit with the given message.",
    risk: "destructive",
    input: GitCommitSchema,
    jsonSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Commit message" },
      },
      required: ["message"],
    },
    async execute(v, ctx) {
      const root = resolveRoot(workspaceRoot);
      await gitAsync(["add", "-A"], root, ctx.signal);
      const result = await gitAsync(["commit", "-m", v.message], root, ctx.signal);
      return { result: result.trim() };
    },
  }).toDefinition();
}
