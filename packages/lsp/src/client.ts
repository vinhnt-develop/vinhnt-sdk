import { spawn, type ChildProcess } from "node:child_process";
import { createInterface, type Interface as ReadlineInterface } from "node:readline";
import { KernelError } from "@vinhnt-sdk/schema";
import type {
  JsonRpcRequest, JsonRpcResponse, JsonRpcNotification,
  LspInitializeResult, LspDiagnostic, LspDiagnosticParams,
  LspSymbol, LspHoverResult, LspLocation, LspCompletionItem,
  LspCompletionList, LspDocumentSymbol, LspSignatureHelp,
  LspCodeAction, LspTextEdit, LspWorkspaceEdit, LspRange,
  LspServerDefinition, LspPosition, LspFormattingOptions,
} from "./types.js";

let requestIdCounter = 0;
function nextId(): number {
  return ++requestIdCounter;
}

export interface LspClientEvents {
  onDiagnostics: (uri: string, diagnostics: LspDiagnostic[]) => void;
  onError: (error: Error) => void;
  onExit: (code: number | null, signal: string | null) => void;
}

export class LspClient {
  private process: ChildProcess | null = null;
  private rl: ReadlineInterface | null = null;
  private pending = new Map<number | string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private buffer = "";
  private _connected = false;
  private _ready = false;
  private readonly events: LspClientEvents;

  readonly root: string;
  readonly serverId: string;
  readonly spawnedAt: number;

  constructor(
    readonly definition: LspServerDefinition,
    root: string,
    private readonly initTimeoutMs: number,
    events?: Partial<LspClientEvents>,
  ) {
    this.root = root;
    this.serverId = definition.id;
    this.spawnedAt = Date.now();
    this.events = {
      onDiagnostics: events?.onDiagnostics ?? (() => {}),
      onError: events?.onError ?? ((err) => console.warn(`[LSP ${definition.id}]`, err.message)),
      onExit: events?.onExit ?? (() => {}),
    };
  }

  get connected(): boolean {
    return this._connected;
  }

  get ready(): boolean {
    return this._ready;
  }

  async start(): Promise<void> {
    if (this.process) return;

    const def = this.definition;
    const env = { ...process.env, ...def.env };

    this.process = spawn(def.command, def.args, {
      stdio: ["pipe", "pipe", "pipe"],
      env,
    });

    this.process.on("error", (err) => {
      this._connected = false;
      this.events.onError(err);
    });

    this.process.on("exit", (code, signal) => {
      this._connected = false;
      this._ready = false;
      this.process = null;
      this.cleanupPending(new Error(`LSP server exited (code=${code}, signal=${signal})`));
      this.events.onExit(code, signal);
    });

    this.process.stderr?.on("data", (_chunk: Buffer) => {
      // LSP servers often log debug info to stderr — ignore by default
    });

    this.rl = createInterface({ input: this.process.stdout!, crlfDelay: Infinity });
    this.rl.on("line", (line: string) => {
      this.handleMessage(line);
    });

    await this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.request<LspInitializeResult>("initialize", {
      processId: process.pid,
      rootUri: `file://${this.root.replace(/\\/g, "/")}`,
      capabilities: {
        textDocument: {
          synchronization: { dynamicRegistration: false, didSave: false },
          diagnostic: { dynamicRegistration: false },
          completion: { completionItem: { snippetSupport: true } },
          hover: { dynamicRegistration: false },
          definition: { dynamicRegistration: false },
          typeDefinition: { dynamicRegistration: false },
          implementation: { dynamicRegistration: false },
          references: { dynamicRegistration: false },
          documentSymbol: { dynamicRegistration: false },
          signatureHelp: { dynamicRegistration: false },
          codeAction: { dynamicRegistration: false },
          rename: { dynamicRegistration: false },
          formatting: { dynamicRegistration: false },
        },
        workspace: {
          symbol: { dynamicRegistration: false },
        },
      },
      initializationOptions: this.definition.initializationOptions ?? {},
    }, this.initTimeoutMs);

    this._connected = true;

    this.sendNotification("initialized", {});
    this._ready = true;
  }

  async shutdown(): Promise<void> {
    if (!this.process) return;

    try {
      await this.request("shutdown", null, 5000);
    } catch { /* ignore */ }

    this.sendNotification("exit", null);

    const proc = this.process;
    const killTimer = setTimeout(() => {
      proc.kill("SIGKILL");
    }, 3000);

    return new Promise((resolve) => {
      proc.on("exit", () => {
        clearTimeout(killTimer);
        this._connected = false;
        this._ready = false;
        this.process = null;
        resolve();
      });
      // Force kill if still alive
      setTimeout(() => {
        try { proc.kill("SIGKILL"); } catch { /* */ }
        resolve();
      }, 3000);
    });
  }

  /* ── File sync ── */

  private fileVersions = new Map<string, number>();

  openFile(uri: string, languageId: string, text: string): void {
    const version = (this.fileVersions.get(uri) ?? 0) + 1;
    this.fileVersions.set(uri, version);
    this.sendNotification("textDocument/didOpen", {
      textDocument: { uri, languageId, version, text },
    });
  }

  changeFile(uri: string, text: string): void {
    const version = (this.fileVersions.get(uri) ?? 0) + 1;
    this.fileVersions.set(uri, version);
    this.sendNotification("textDocument/didChange", {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    });
  }

  closeFile(uri: string): void {
    this.fileVersions.delete(uri);
    this.sendNotification("textDocument/didClose", {
      textDocument: { uri },
    });
  }

  /* ── LSP requests ── */

  async getDiagnostics(uri: string): Promise<LspDiagnostic[]> {
    try {
      const result = await this.request<{ diagnostics: LspDiagnostic[] }>("textDocument/diagnostic", {
        textDocument: { uri },
      }, this.initTimeoutMs);
      return result.diagnostics;
    } catch {
      // Some servers don't support pull diagnostics → return empty (push model)
      return [];
    }
  }

  async getSymbols(query: string): Promise<LspSymbol[]> {
    const result = await this.request<LspSymbol[]>("workspace/symbol", { query }, 10000);
    return result ?? [];
  }

  async getHover(uri: string, position: LspPosition): Promise<LspHoverResult | null> {
    try {
      const result = await this.request<LspHoverResult | null>("textDocument/hover", {
        textDocument: { uri },
        position,
      }, 5000);
      return result;
    } catch {
      return null;
    }
  }

  async getDefinition(uri: string, position: LspPosition): Promise<LspLocation | null> {
    try {
      const result = await this.request<LspLocation | LspLocation[] | null>("textDocument/definition", {
        textDocument: { uri },
        position,
      }, 5000);
      if (!result) return null;
      if (Array.isArray(result)) return result[0] ?? null;
      return result;
    } catch {
      return null;
    }
  }

  async getReferences(uri: string, position: LspPosition): Promise<LspLocation[]> {
    try {
      const result = await this.request<LspLocation[] | null>("textDocument/references", {
        textDocument: { uri },
        position,
        context: { includeDeclaration: true },
      }, 5000);
      return result ?? [];
    } catch {
      return [];
    }
  }

  async getCompletion(uri: string, position: LspPosition): Promise<LspCompletionItem[]> {
    try {
      const result = await this.request<LspCompletionList | LspCompletionItem[]>("textDocument/completion", {
        textDocument: { uri },
        position,
      }, 5000);
      if (!result) return [];
      if (Array.isArray(result)) return result;
      return result.items ?? [];
    } catch {
      return [];
    }
  }

  async getTypeDefinition(uri: string, position: LspPosition): Promise<LspLocation | null> {
    try {
      const result = await this.request<LspLocation | LspLocation[] | null>("textDocument/typeDefinition", {
        textDocument: { uri }, position,
      }, 5000);
      if (!result) return null;
      if (Array.isArray(result)) return result[0] ?? null;
      return result;
    } catch { return null; }
  }

  async getImplementation(uri: string, position: LspPosition): Promise<LspLocation | null> {
    try {
      const result = await this.request<LspLocation | LspLocation[] | null>("textDocument/implementation", {
        textDocument: { uri }, position,
      }, 5000);
      if (!result) return null;
      if (Array.isArray(result)) return result[0] ?? null;
      return result;
    } catch { return null; }
  }

  async getSignatureHelp(uri: string, position: LspPosition): Promise<LspSignatureHelp | null> {
    try {
      const result = await this.request<LspSignatureHelp | null>("textDocument/signatureHelp", {
        textDocument: { uri }, position,
      }, 5000);
      return result ?? null;
    } catch { return null; }
  }

  async getDocumentSymbols(uri: string): Promise<LspDocumentSymbol[]> {
    try {
      const result = await this.request<LspDocumentSymbol[]>("textDocument/documentSymbol", {
        textDocument: { uri },
      }, 10000);
      return result ?? [];
    } catch { return []; }
  }

  async getCodeActions(uri: string, range: LspRange, context: { diagnostics: LspDiagnostic[] }): Promise<LspCodeAction[]> {
    try {
      const result = await this.request<LspCodeAction[] | null>("textDocument/codeAction", {
        textDocument: { uri },
        range,
        context,
      }, 5000);
      return result ?? [];
    } catch { return []; }
  }

  async getFormatting(uri: string, options: LspFormattingOptions): Promise<LspTextEdit[]> {
    try {
      const result = await this.request<LspTextEdit[] | null>("textDocument/formatting", {
        textDocument: { uri },
        options,
      }, 10000);
      return result ?? [];
    } catch { return []; }
  }

  async getRename(uri: string, position: LspPosition, newName: string): Promise<LspWorkspaceEdit | null> {
    try {
      const result = await this.request<LspWorkspaceEdit | null>("textDocument/rename", {
        textDocument: { uri }, position, newName,
      }, 5000);
      return result ?? null;
    } catch { return null; }
  }

  /* ── Low-level JSON-RPC ── */

  private async request<T>(method: string, params: unknown, timeoutMs: number): Promise<T> {
    const id = nextId();
    const msg: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`LSP request "${method}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });

      try {
        this.sendRaw(msg);
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  private sendNotification(method: string, params: unknown): void {
    const msg: JsonRpcNotification = { jsonrpc: "2.0", method, params };
    this.sendRaw(msg);
  }

  private sendRaw(msg: unknown): void {
    if (!this.process?.stdin?.writable) {
      throw new KernelError("internal_error", "LSP server not connected");
    }
    const json = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(json, "utf-8")}\r\n\r\n`;
    this.process.stdin.write(header + json);
  }

  private handleMessage(line: string): void {
    this.buffer += line;

    // LSP uses Content-Length headers
    const lengthMatch = this.buffer.match(/Content-Length:\s*(\d+)/i);
    if (!lengthMatch) return;

    const contentLength = parseInt(lengthMatch[1]!, 10);
    const headerEnd = this.buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;

    const contentStart = headerEnd + 4;
    const content = this.buffer.slice(contentStart, contentStart + contentLength);

    if (content.length < contentLength) return; // Wait for more data

    this.buffer = this.buffer.slice(contentStart + contentLength);

    try {
      const msg = JSON.parse(content);

      if (typeof msg.id !== "undefined" && "result" in msg) {
        this.handleResponse(msg as JsonRpcResponse);
      } else if (typeof msg.id !== "undefined" && "error" in msg) {
        this.handleError(msg as JsonRpcResponse);
      } else if (msg.method) {
        this.handleNotification(msg as JsonRpcNotification);
      }
    } catch { /* malformed JSON — skip */ }
  }

  private handleResponse(msg: JsonRpcResponse): void {
    const pending = this.pending.get(msg.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(msg.id);

    if (msg.error) {
      pending.reject(new Error(`LSP error ${msg.error.code}: ${msg.error.message}`));
    } else {
      pending.resolve(msg.result);
    }
  }

  private handleError(msg: JsonRpcResponse): void {
    const pending = this.pending.get(msg.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(msg.id);
    pending.reject(new Error(`LSP error ${msg.error?.code}: ${msg.error?.message}`));
  }

  private handleNotification(msg: JsonRpcNotification): void {
    switch (msg.method) {
      case "textDocument/publishDiagnostics": {
        const params = msg.params as LspDiagnosticParams;
        this.events.onDiagnostics(params.uri, params.diagnostics);
        break;
      }
      // window/logMessage, telemetry/event — ignore
    }
  }

  private cleanupPending(error: Error): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
