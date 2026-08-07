import { Client, StreamableHTTPClientTransport, SSEClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import type { Tool, ListToolsResult, ListPromptsResult, ListResourcesResult, Prompt, Resource } from "@modelcontextprotocol/client";
import type { JSONRPCMessage } from "@modelcontextprotocol/client";
import type { McpServerConfigItem, McpStdioServerConfig, McpHttpServerConfig } from "./config.js";
import { McpTokenStore } from "./token-store.js";
import { getValidAccessToken, runOAuthFlow } from "./oauth-flow.js";
import { execSync } from "node:child_process";

export { McpTokenStore } from "./token-store.js";
export { runOAuthFlow, getValidAccessToken } from "./oauth-flow.js";

export interface McpReconnectOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface McpOAuthContext {
  tokenStore: McpTokenStore;
  serverName: string;
  clientId: string;
  clientSecret?: string;
  tokenUrl: string;
  authorizationUrl: string;
  redirectPort?: number;
}

async function resolveAccessToken(httpCfg: McpHttpServerConfig, serverName: string): Promise<string | undefined> {
  if (httpCfg.auth?.type === "bearer" && httpCfg.auth.token) {
    return httpCfg.auth.token;
  }
  if (httpCfg.auth?.type === "oauth") {
    if (httpCfg.auth.accessToken) {
      return httpCfg.auth.accessToken;
    }
    if (httpCfg.auth.clientId && httpCfg.auth.tokenUrl) {
      const tokenStore = new McpTokenStore();
      if (httpCfg.auth.authorizationUrl) {
        const oauthCtx: McpOAuthContext = {
          tokenStore,
          serverName,
          clientId: httpCfg.auth.clientId,
          clientSecret: httpCfg.auth.clientSecret,
          tokenUrl: httpCfg.auth.tokenUrl,
          authorizationUrl: httpCfg.auth.authorizationUrl,
          redirectPort: httpCfg.auth.redirectPort,
        };
        try {
          const tokenResult = await getValidAccessToken(serverName, tokenStore, {
            tokenUrl: oauthCtx.tokenUrl,
            clientId: oauthCtx.clientId,
            clientSecret: oauthCtx.clientSecret,
          });
          return tokenResult.accessToken;
        } catch {
          return await runOAuthFlow(oauthCtx);
        }
      }
    }
  }
  return undefined;
}

async function buildRequestInit(httpCfg: McpHttpServerConfig, serverName: string): Promise<RequestInit> {
  const reqInit: RequestInit = {};
  if (httpCfg.headers) {
    reqInit.headers = { ...httpCfg.headers as Record<string, string> };
  }
  if (httpCfg.auth?.type === "bearer" && httpCfg.auth.token) {
    const bearerHeader = { Authorization: `Bearer ${httpCfg.auth.token}` };
    reqInit.headers = { ...(reqInit.headers as Record<string, string> || {}), ...bearerHeader };
  } else if (httpCfg.auth?.type === "oauth") {
    const token = await resolveAccessToken(httpCfg, serverName);
    if (token) {
      const authHeader = { Authorization: `Bearer ${token}` };
      reqInit.headers = { ...(reqInit.headers as Record<string, string> || {}), ...authHeader };
    }
  }
  return reqInit;
}

function createTransportSync(config: McpServerConfigItem, serverName: string) {
  if ("command" in config && typeof config.command === "string") {
    const stdioCfg = config as McpStdioServerConfig;
    const transport = new StdioClientTransport({
      command: stdioCfg.command,
      args: stdioCfg.args ? [...stdioCfg.args] : [],
      env: { ...process.env, ...stdioCfg.env } as Record<string, string>,
    });
    transport.onerror = (err) => {
      console.error(`[MCP:${serverName}] Stdio transport error:`, err);
    };
    return transport;
  }
  return null;
}

async function createTransportAsync(config: McpServerConfigItem, serverName: string, reconnectOpts?: Required<McpReconnectOptions>) {
  const stdio = createTransportSync(config, serverName);
  if (stdio) return stdio;

  if ("url" in config && typeof config.url === "string") {
    const httpCfg = config as McpHttpServerConfig;
    const url = new URL(httpCfg.url);

    if (url.protocol === "http:" || url.protocol === "https:") {
      const reqInit = await buildRequestInit(httpCfg, serverName);
      // Try StreamableHTTP first, fall back to SSE for older servers
      try {
        const transport = new StreamableHTTPClientTransport(url, {
          requestInit: reqInit,
          reconnectionOptions: {
            maxReconnectionDelay: reconnectOpts?.maxDelayMs ?? 30_000,
            initialReconnectionDelay: reconnectOpts?.baseDelayMs ?? 1_000,
            reconnectionDelayGrowFactor: 2.0,
            maxRetries: reconnectOpts?.maxRetries ?? 2,
          },
        });
        return transport;
      } catch {
        console.log(`[MCP:${serverName}] StreamableHTTP failed, falling back to SSE`);
        return new SSEClientTransport(url, {
          requestInit: reqInit,
        });
      }
    }
  }

  throw new Error(`Unsupported MCP server config for "${serverName}"`);
}

function cloneConfig(config: McpServerConfigItem): McpServerConfigItem {
  return JSON.parse(JSON.stringify(config)) as McpServerConfigItem;
}

const DEFAULT_RECONNECT_OPTIONS: Required<McpReconnectOptions> = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
};

/** Find all descendant PIDs of a given PID using pgrep -P. Returns [] on win32 or error. */
function descendants(pid: number): number[] {
  if (process.platform === "win32") return [];
  try {
    const out = execSync(`pgrep -P ${pid}`, { encoding: "utf-8", timeout: 2000 }).trim();
    if (!out) return [];
    const children = out.split("\n").map(Number).filter(Boolean);
    return [...children, ...children.flatMap(descendants)];
  } catch {
    return [];
  }
}

export class McpClient {
  readonly name: string;
  private _client: Client;
  private _config: McpServerConfigItem;
  private _reconnectOpts: Required<McpReconnectOptions>;
  private _transport: StdioClientTransport | StreamableHTTPClientTransport | SSEClientTransport | null = null;
  private _connected = false;
  private _closed = false;
  private _isReconnecting = false;
  private _reconnectAttempt = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _requestHandlers: Array<{ method: string; handler: (req: unknown) => unknown | Promise<unknown> }> = [];

  constructor(name: string, config: McpServerConfigItem, reconnectOpts?: McpReconnectOptions) {
    this.name = name;
    this._config = cloneConfig(config);
    this._reconnectOpts = { ...DEFAULT_RECONNECT_OPTIONS, ...reconnectOpts };
    this._transport = createTransportSync(config, name);
    this._client = this._createClient();
    if (this._transport == null) {
      this._transport = null;
    }
  }

  setRequestHandler(method: string, handler: (req: unknown) => unknown | Promise<unknown>): void {
    this._requestHandlers.push({ method, handler });
    this._client.setRequestHandler(method as never, handler as never);
  }

  private _createClient(): Client {
    const client = new Client(
      { name: "vnt-agent", version: "0.1.0" },
      { capabilities: {} },
    );
    client.onclose = () => {
      this._connected = false;
      this._scheduleReconnect();
    };
    return client;
  }

  private _reapplyHandlers(): void {
    for (const { method, handler } of this._requestHandlers) {
      this._client.setRequestHandler(method as never, handler as never);
    }
  }

  private _scheduleReconnect(): void {
    if (this._closed) return;
    if (this._reconnectAttempt >= this._reconnectOpts.maxRetries) return;
    if (this._isReconnecting) return;
    if (this._reconnectTimer !== null) return;

    const delay = Math.min(
      this._reconnectOpts.baseDelayMs * Math.pow(2, this._reconnectAttempt),
      this._reconnectOpts.maxDelayMs,
    );

    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      await this._tryReconnect();
    }, delay);
  }

  private async _tryReconnect(): Promise<void> {
    if (this._closed || this._connected) return;
    if (this._isReconnecting) return;
    this._isReconnecting = true;

    if (this._transport) {
      await this._transport.close().catch(() => {});
    }

    try {
      this._transport = await createTransportAsync(this._config, this.name, this._reconnectOpts);
      this._client = this._createClient();
      this._reapplyHandlers();
      await this._client.connect(this._transport);
      this._connected = true;
      this._reconnectAttempt = 0;
      this._isReconnecting = false;
    } catch {
      this._reconnectAttempt++;
      this._isReconnecting = false;
      this._scheduleReconnect();
    }
  }

  get isConnected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    if (this._connected || this._closed) return;
    if (!this._transport) {
      this._transport = await createTransportAsync(this._config, this.name, this._reconnectOpts);
    }
    this._client = this._createClient();
    this._reapplyHandlers();
    await this._client.connect(this._transport);
    this._connected = true;
  }

  async listTools(): Promise<readonly Tool[]> {
    if (!this._connected) throw new Error(`MCP server "${this.name}" not connected`);
    const result = await this._client.listTools() as ListToolsResult;
    return result.tools ?? [];
  }

  async listPrompts(): Promise<readonly Prompt[]> {
    if (!this._connected) throw new Error(`MCP server "${this.name}" not connected`);
    const result = await this._client.listPrompts() as ListPromptsResult;
    return result.prompts ?? [];
  }

  async listResources(): Promise<readonly Resource[]> {
    if (!this._connected) throw new Error(`MCP server "${this.name}" not connected`);
    const result = await this._client.listResources() as ListResourcesResult;
    return result.resources ?? [];
  }

  async callTool(name: string, args: Record<string, unknown> | undefined): Promise<unknown> {
    if (!this._connected) throw new Error(`MCP server "${this.name}" not connected`);
    const result = await this._client.callTool({ name, arguments: args });
    return (result as { content: unknown[] }).content ?? [];
  }

  async sendNotification(method: string, params?: unknown): Promise<void> {
    if (!this._connected || !this._transport) throw new Error(`MCP server "${this.name}" not connected`);
    await this._transport.send({
      jsonrpc: "2.0",
      method,
      params,
    } as JSONRPCMessage);
  }

  /** Notify the MCP server that the tool list has changed (standard MCP notification). */
  async notifyToolsChanged(): Promise<void> {
    await this.sendNotification("notifications/tools/list_changed");
  }

  disconnect(): void {
    this._closed = true;
    this._connected = false;
    this._isReconnecting = false;

    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    // Kill descendant processes for stdio transports before closing
    if (this._transport instanceof StdioClientTransport) {
      try {
        const pid = (this._transport as unknown as { _process?: { pid?: number } })._process?.pid;
        if (pid) {
          for (const childPid of descendants(pid)) {
            try { process.kill(childPid, "SIGTERM"); } catch { /* already dead */ }
          }
        }
      } catch { /* ignore */ }
    }

    this._client.close().catch(() => {});

    if (this._transport) {
      this._transport.close().catch(() => {});
      this._transport = null;
    }
  }
}
