import { execFile } from "node:child_process";
import type { ToolContext } from "./context.js";
import { commandPattern } from "./arity.js";
import { killProcessTree, treeKillSpawnOptions, parseCommand, type SandboxScope } from "@vinhnt-sdk/sandbox";
import { z } from "zod";
import { defineTool } from "@vinhnt-sdk/tools";
import { detectInjectionPatterns, sanitizeEnv } from "@vinhnt-sdk/security";
import { createSandbox } from "./tool-sandbox.js";

const ExecuteCommandSchema = z.object({
  command: z.string().min(1),
  timeoutMs: z.number().positive().optional(),
});

/** Configuration for the {@link createShellTool} command-execution tool. */
export interface ShellToolConfig {
  workspaceRoot: string | (() => string);
  defaultTimeoutMs: number;
  /** Hard cap on shell command timeout in ms (default: 300000) */
  maxTimeoutMs?: number;
  /** If true, prompts for permission before executing shell commands (default: true) */
  askPermission?: boolean;
  /** Sandbox scope for command execution (default: "process") */
  sandboxScope?: SandboxScope;
  /** Allowed filesystem paths for the executed command (enforced in the sandbox backend) */
  allowedPaths?: string[];
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
        ...treeKillSpawnOptions(),
        env: env && Object.keys(env).length > 0
          ? { ...sanitizeEnv(), ...env }
          : sanitizeEnv(),
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
        killProcessTree(child);
        reject(new DOMException(signal.reason ?? "Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        killProcessTree(child);
        reject(new DOMException(signal.reason ?? "Aborted", "AbortError"));
      }, { once: true });
    }
  });
}

/**
 * Create the `shell` tool that executes a command in the workspace root with
 * timeout, tree-scoped kill-on-abort, and optional permission prompting.
 */
export function createShellTool(config: ShellToolConfig) {
  const sandbox = createSandbox({
    defaultTimeoutMs: config.defaultTimeoutMs,
    scope: config.sandboxScope ?? "process",
    ...(config.allowedPaths !== undefined ? { allowedPaths: config.allowedPaths } : {}),
  });

  return defineTool<{ command: string; timeoutMs?: number | undefined }, ExecResult>({
    name: "execute_command",
    description: "Execute a shell command in the workspace directory. Returns stdout and stderr.",
    risk: "write",
    selfApproving: config.askPermission !== false,
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

      // Check for prompt injection patterns in command
      const injections = detectInjectionPatterns(v.command);
      if (injections.length > 0) {
        return {
          stdout: "",
          stderr: `Blocked: command contains suspected injection patterns: ${injections.join(", ")}`,
          exitCode: 1,
        };
      }

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

      // Use sandbox for execution
      const result = await sandbox.execute({
        command: v.command,
        cwd: root,
        timeoutMs: timeout,
        env: ctx.env,
        signal: ctx.signal,
      });

      return result.result;
    },
  }).toDefinition();
}
