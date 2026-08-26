/**
 * MCP Stdio Transport — communicates with MCP servers over stdin/stdout.
 */

import { spawn, type ChildProcess } from "node:child_process";
import type { McpTransport, McpServerConfig, JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from "../types.js";

export class StdioTransport implements McpTransport {
  private child: ChildProcess | null = null;
  private readonly handlers = new Set<(msg: JsonRpcResponse | JsonRpcNotification) => void>();
  private readonly buffer: string[] = [];
  private requestResolve: ((res: JsonRpcResponse) => void) | null = null;
  private readonly timeoutMs: number;

  constructor(config: McpServerConfig) {
    this.timeoutMs = config.timeoutMs ?? 30_000;
    const command = config.command ?? "node";
    const args = config.args ?? [];

    this.child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...config.env },
      windowsHide: true,
    });

    let pending = "";
    this.child.stdout?.on("data", (chunk: Buffer) => {
      pending += chunk.toString();
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed) as JsonRpcResponse | JsonRpcNotification;
          if ("id" in msg && msg.id !== undefined) {
            this.requestResolve?.(msg as JsonRpcResponse);
            this.requestResolve = null;
          } else {
            for (const handler of this.handlers) {
              handler(msg);
            }
          }
        } catch {
          // ignore malformed lines
        }
      }
    });

    this.child.stderr?.on("data", (chunk: Buffer) => {
      // MCP servers may log to stderr — ignore for now
      void chunk;
    });

    this.child.on("error", () => {
      this.requestResolve = null;
    });

    this.child.on("close", () => {
      this.requestResolve = null;
    });
  }

  async request(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    if (!this.child?.stdin || this.child.killed) {
      throw new Error("MCP transport closed");
    }

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.requestResolve = null;
        reject(new Error(`MCP request ${req.method} timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      this.requestResolve = (res) => {
        clearTimeout(timer);
        resolve(res);
      };

      const data = JSON.stringify(req) + "\n";
      this.child!.stdin!.write(data);
    });
  }

  notify(notification: JsonRpcNotification): void {
    if (!this.child?.stdin || this.child.killed) return;
    const data = JSON.stringify(notification) + "\n";
    this.child.stdin.write(data);
  }

  onMessage(handler: (msg: JsonRpcResponse | JsonRpcNotification) => void): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  async close(): Promise<void> {
    if (this.child && !this.child.killed) {
      this.child.kill();
    }
    this.requestResolve = null;
    this.handlers.clear();
  }
}
