import type { Readable, Writable } from "node:stream";
import type { JsonRpcRequest, JsonRpcNotification } from "@vinhnt-sdk/schema";
import { McpServer } from "./mcp-server.js";

export interface McpStdioServerOptions {
  readonly input?: Readable;
  readonly output?: Writable;
}

/**
 * Newline-delimited JSON-RPC stdio transport for {@link McpServer}
 * (MCP stdio framing: one JSON message per line, no embedded newlines).
 *
 * Stateless on purpose: lines that are not valid JSON-RPC requests are
 * ignored (the shared schema response type cannot carry a `null` id for
 * parse errors, and a broken line has no correlatable id anyway).
 */
export class McpStdioServer {
  private buffer = "";
  private listener: ((chunk: Buffer | string) => void) | undefined;

  constructor(
    private readonly server: McpServer,
    private readonly options?: McpStdioServerOptions,
  ) {}

  start(): void {
    if (this.listener !== undefined) return;
    const input = this.options?.input ?? process.stdin;
    this.listener = (chunk) => {
      this.buffer += chunk.toString();
      let index = this.buffer.indexOf("\n");
      while (index >= 0) {
        const line = this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + 1);
        void this.handleLine(line);
        index = this.buffer.indexOf("\n");
      }
    };
    input.on("data", this.listener);
  }

  stop(): void {
    if (this.listener === undefined) return;
    const input = this.options?.input ?? process.stdin;
    input.off("data", this.listener);
    this.listener = undefined;
    this.buffer = "";
  }

  /** Route one raw line: request → response written, notification → handled, junk → ignored. */
  async handleLine(raw: string): Promise<void> {
    const line = raw.trim();
    if (line.length === 0) return;
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (typeof message !== "object" || message === null) return;
    const candidate = message as { id?: unknown; method?: unknown; params?: unknown };
    if (typeof candidate.method !== "string") return;
    const isRequest = (typeof candidate.id === "number" || typeof candidate.id === "string") && candidate.id !== undefined;
    if (isRequest) {
      const response = await this.server.dispatch(message as JsonRpcRequest);
      this.writeLine(JSON.stringify(response));
      return;
    }
    await this.server.handleNotification(message as JsonRpcNotification);
  }

  private writeLine(text: string): void {
    const output = this.options?.output ?? process.stdout;
    output.write(`${text}\n`);
  }
}
