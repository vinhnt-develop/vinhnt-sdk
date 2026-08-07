import { execFile } from "node:child_process";
import type { ToolContext } from "./definitions.js";
import { commandPattern } from "./arity.js";
import { z } from "zod";
import { defineTool } from "./define-tool.js";

const ExecuteCommandSchema = z.object({
  command: z.string().min(1),
  timeoutMs: z.number().positive().optional(),
});

export interface ShellToolConfig {
  workspaceRoot: string | (() => string);
  defaultTimeoutMs: number;
  /** Hard cap on shell command timeout in ms (default: 300000) */
  maxTimeoutMs?: number;
  /** If true, prompts for permission before executing shell commands (default: true) */
  askPermission?: boolean;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function execAsync(
  command: string,
  cwd: string,
  timeoutMs: number,
  signal?: AbortSignal,
  env?: Record<string, string>,
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const parsed = parseCommand(command);
    const child = execFile(
      parsed.file,
      parsed.args,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        encoding: "utf-8" as const,
        windowsHide: true,
        env: env && Object.keys(env).length > 0
          ? { ...process.env, ...env }
          : undefined,
      },
      (err, stdout, stderr) => {
        if (err) {
          const exitCode = typeof err.code === "number" ? err.code : 1;
          resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode });
        } else {
          resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode: 0 });
        }
      },
    );

    if (signal) {
      if (signal.aborted) {
        child.kill();
        reject(new DOMException(signal.reason ?? "Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        child.kill();
        reject(new DOMException(signal.reason ?? "Aborted", "AbortError"));
      }, { once: true });
    }
  });
}

function parseCommand(cmd: string): { file: string; args: string[] } {
  const trimmed = cmd.trim();
  if (!trimmed) return { file: "", args: [] };

  const tokens: string[] = [];
  let i = 0;
  let current = "";
  let inSingle = false;
  let inDouble = false;

  while (i < trimmed.length) {
    const ch = trimmed[i] ?? "";
    if (inSingle) {
      if (ch === "'") { inSingle = false; }
      else { current += ch; }
      i++;
    } else if (inDouble) {
      if (ch === '"') { inDouble = false; }
      else if (ch === "\\" && i + 1 < trimmed.length) { current += trimmed[i + 1]; i += 2; }
      else { current += ch; i++; }
    } else if (ch === "'") { inSingle = true; i++; }
    else if (ch === '"') { inDouble = true; i++; }
    else if (ch === "\\" && i + 1 < trimmed.length) { current += trimmed[i + 1]; i += 2; }
    else if (/\s/.test(ch)) {
      if (current) { tokens.push(current); current = ""; }
      i++;
    }
    else { current += ch; i++; }
  }
  if (current) tokens.push(current);

  if (tokens.length === 0) return { file: "", args: [] };
  return { file: tokens[0]!, args: tokens.slice(1) };
}

export function createShellTool(config: ShellToolConfig) {
  return defineTool<{ command: string; timeoutMs?: number }, ExecResult>({
    name: "execute_command",
    description: "Execute a shell command in the workspace directory. Returns stdout and stderr.",
    risk: "write",
    timeoutMs: 120_000,
    input: ExecuteCommandSchema,
    jsonSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to run" },
        timeoutMs: { type: "number", description: "Timeout in ms (default 30_000)", default: 30_000 },
      },
      required: ["command"],
    },
    async execute(v, ctx: ToolContext) {
      const root = typeof config.workspaceRoot === "function" ? config.workspaceRoot() : config.workspaceRoot;
      const timeout = Math.min(v.timeoutMs ?? config.defaultTimeoutMs, config.maxTimeoutMs ?? 300_000);

      if (config.askPermission !== false) {
        const reply = await ctx.ask({
          permission: "shell",
          resource: v.command,
          reason: `Run shell command: ${v.command}`,
          savePatterns: [commandPattern(v.command)],
        });
        if (reply === "reject") {
          return { stdout: "", stderr: "", exitCode: 1 };
        }
      }

      return execAsync(v.command, root, timeout, ctx.signal, ctx.env);
    },
  }).toDefinition();
}
