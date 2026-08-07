interface McpResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}

type StatusListener = (status: FigmaStatus) => void;

export type FigmaStatus = "disconnected" | "connecting" | "connected" | "error";
export type FigmaTool =
  | { name: "get_metadata"; args: { nodeId?: string; clientLanguages?: string; clientFrameworks?: string } }
  | { name: "get_design_context"; args: { nodeId?: string; clientLanguages?: string; clientFrameworks?: string; forceCode?: boolean; artifactType?: string; taskType?: string } }
  | { name: "get_screenshot"; args: { nodeId?: string; contentsOnly?: boolean } }
  | { name: "get_variable_defs"; args: { nodeId?: string; clientLanguages?: string; clientFrameworks?: string } }
  | { name: "get_motion_context"; args: { nodeId?: string; recursive?: boolean; clientLanguages?: string; clientFrameworks?: string } }
  | { name: "get_figjam"; args: { nodeId?: string; includeImagesOfNodes?: boolean } };

export class FigmaService {
  private _url: string;
  private _sessionId: string | null = null;
  private _connected = false;
  private _listeners: Set<StatusListener> = new Set();
  private _requestId = 0;

  constructor(url = "http://127.0.0.1:3845/mcp") {
    this._url = url;
  }

  get status(): FigmaStatus {
    if (this._connected) return "connected";
    return "disconnected";
  }

  get isConnected(): boolean {
    return this._connected;
  }

  onStatusChange(fn: StatusListener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  private _emit(status: FigmaStatus) {
    for (const fn of this._listeners) fn(status);
  }

  private _nextId(): number {
    return ++this._requestId;
  }

  async connect(): Promise<void> {
    if (this._connected) return;
    this._emit("connecting");

    try {
      const sessionId = await this._init();
      this._sessionId = sessionId;
      this._connected = true;
      this._emit("connected");
    } catch (e) {
      this._emit("error");
      throw e;
    }
  }

  disconnect(): void {
    this._connected = false;
    this._sessionId = null;
    this._emit("disconnected");
  }

  async listTools(): Promise<Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>> {
    const raw = await this._request("tools/list", {});
    const result = raw as { tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> };
    return result.tools ?? [];
  }

  async callTool(tool: FigmaTool): Promise<McpResult> {
    const raw = await this._request("tools/call", {
      name: tool.name,
      arguments: tool.args,
    });
    return raw as McpResult;
  }

  private async _request(method: string, params: unknown): Promise<unknown> {
    if (!this._sessionId && method !== "initialize") {
      throw new Error("Not connected to Figma MCP server");
    }

    const body = JSON.stringify({ jsonrpc: "2.0", id: String(this._nextId()), method, params });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (this._sessionId) headers["mcp-session-id"] = this._sessionId;

    const res = await fetch(this._url, { method: "POST", headers, body });
    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error");
      throw new Error(`Figma MCP request failed: ${res.status} ${errText}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text();

    if (contentType.includes("text/event-stream")) {
      return this._parseSSEResult(text);
    }

    return JSON.parse(text);
  }

  private async _init(): Promise<string> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: "init",
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "vnt-agent-ui", version: "0.1.0" },
      },
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };

    const res = await fetch(this._url, { method: "POST", headers, body });
    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error");
      throw new Error(`Figma init failed: ${res.status} ${errText}`);
    }

    const sessionId = res.headers.get("mcp-session-id");
    if (!sessionId) throw new Error("No session ID in Figma init response");

    const text = await res.text();
    this._parseSSEResult(text);

    headers["mcp-session-id"] = sessionId;

    await fetch(this._url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });

    return sessionId;
  }

  private _parseSSEResult(text: string): unknown {
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          return JSON.parse(line.slice(6));
        } catch { }
      }
    }
    return {};
  }
}

export const figmaService = new FigmaService();
