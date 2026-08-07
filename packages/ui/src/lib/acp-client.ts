// Self-contained ACP client — JSON-RPC 2.0 over WebSocket
// No dependency on @vinhnt-sdk/mcp to keep UI package clean

type JsonRpcId = string | number | null;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export type AcpConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface TaskStreamNotification {
  taskId: string;
  type: "tool_call" | "tool_result" | "tool_error" | "tool_self_correct" | "error" | "done" | "status" | "token" | "token_counted" | "model_cost" | "permission" | "permission_reply" | "run_start" | "step_start" | "step_end" | "step_type_changed" | "thinking_start" | "thinking" | "thinking_end" | "context_compressed";
  data: unknown;
}

export interface PermissionRequestInfo {
  id: string;
  runId: string;
  toolName: string;
  resource: string;
  reason: string;
  prompt: string;
  occurredAt: string;
}

export type TaskEventHandler = (event: TaskStreamNotification) => void;

/** Chat-level run mode: how the agent behaves + approval policy for a task. */
export type ChatRunMode = "ask" | "auto" | "plan" | "build";

export interface ChatRunModeOptions {
  autoApproval: boolean;
  behaviourMode: "build" | "plan";
}

/** Map a chat mode to ACP task/start options. Default is safe "ask". */
export function chatModeToOptions(mode?: ChatRunMode): ChatRunModeOptions {
  switch (mode) {
    case "auto":
      return { autoApproval: true, behaviourMode: "build" };
    case "plan":
      return { autoApproval: false, behaviourMode: "plan" };
    case "build":
      return { autoApproval: false, behaviourMode: "build" };
    case "ask":
    default:
      return { autoApproval: false, behaviourMode: "build" };
  }
}

export interface AcpClientOptions {
  url?: string;
  clientId?: string;
  clientName?: string;
  timeout?: number;
  maxReconnectAttempts?: number;
  onTaskEvent?: TaskEventHandler;
  onStatusChange?: (status: AcpConnectionStatus) => void;
  onReconnected?: () => void;
}

export class AcpClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string | number, PendingRequest>();
  private requestId = 0;
  private sessionId: string | null = null;
  private closed = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private options: Required<AcpClientOptions>;

  constructor(opts: AcpClientOptions = {}) {
    this.options = {
      url: "ws://localhost:3101/acp",
      clientId: crypto.randomUUID(),
      clientName: "vnt-agent-ui",
      timeout: 30000,
      maxReconnectAttempts: 10,
      onTaskEvent: () => {},
      onStatusChange: () => {},
      onReconnected: () => {},
      ...opts,
    };
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get currentSessionId(): string | null {
    return this.sessionId;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (typeof WebSocket === "undefined") {
      throw new Error("WebSocket not available in this environment");
    }

    this.options.onStatusChange("connecting");
    this.closed = false;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.options.url);

      this.ws.addEventListener("open", () => {
        this.reconnectAttempt = 0;
        this.options.onStatusChange("connected");
        resolve();
      });

      this.ws.addEventListener("message", (event: MessageEvent) => {
        const raw = event.data;
        let msg: unknown;
        try {
          msg = JSON.parse(typeof raw === "string" ? raw : raw);
        } catch {
          return;
        }

        if (!msg || typeof msg !== "object") return;

        const parsed = msg as Record<string, unknown>;

        // Notification (no id)
        if (!("id" in parsed)) {
          if (parsed.method === "task/stream") {
            this.options.onTaskEvent(parsed.params as TaskStreamNotification);
          }
          return;
        }

        // Response with id
        const id = parsed.id as JsonRpcId;
        if (id === null || id === undefined) return;

        const pending = this.pending.get(id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(id);

        if ("error" in parsed) {
          const err = parsed.error as { code: number; message: string };
          pending.reject(new Error(`ACP error ${err.code}: ${err.message}`));
        } else if ("result" in parsed) {
          pending.resolve(parsed.result);
        }
      });

      this.ws.addEventListener("close", () => {
        this.options.onStatusChange("disconnected");
        if (!this.closed) {
          this.options.onStatusChange("reconnecting");
          this.scheduleReconnect();
        }
      });

      this.ws.addEventListener("error", () => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(new Error("WebSocket connection failed"));
        }
      });
    });
  }

  disconnect(): void {
    this.closed = true;
    this.reconnectAttempt = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearPending(new Error("Disconnected"));
    this.ws?.close();
    this.ws = null;
    this.sessionId = null;
    this.options.onStatusChange("disconnected");
  }

  async createSession(caps?: {
    theme?: "light" | "dark" | "high-contrast";
    platform?: "vscode" | "browser" | "jetbrains" | "neovim" | "cli" | "other";
    supportsMarkdown?: boolean;
  }): Promise<string> {
    const result = (await this.request("session/create", {
      clientId: this.options.clientId,
      clientName: this.options.clientName,
      capabilities: caps,
    })) as { sessionId: string };

    this.sessionId = result.sessionId;
    return result.sessionId;
  }

  async startTask(
    prompt: string,
    opts?: { model?: string; maxSteps?: number; autoApproval?: boolean; behaviourMode?: "build" | "plan"; files?: string[] }
  ): Promise<{ taskId: string; runId: string }> {
    if (!this.sessionId) throw new Error("No active session. Call createSession() first.");

    return (await this.request("task/start", {
      sessionId: this.sessionId,
      prompt,
      ...opts,
    })) as { taskId: string; runId: string };
  }

  async cancelTask(taskId: string, reason?: string): Promise<boolean> {
    const result = (await this.request("task/cancel", { taskId, reason })) as { ok: boolean };
    return result.ok;
  }

  async ping(): Promise<number> {
    const result = (await this.request("ping", {})) as { timestamp: number };
    return result.timestamp;
  }

  async listPermissions(runId?: string): Promise<{ pending: PermissionRequestInfo[] }> {
    return (await this.request("permission/list", { runId })) as { pending: PermissionRequestInfo[] };
  }

  async replyPermission(requestId: string, reply: "once" | "always" | "reject"): Promise<{ ok: boolean }> {
    return (await this.request("permission/reply", { requestId, reply })) as { ok: boolean };
  }

  private async request(method: string, params: unknown): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected");
    }

    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`ACP request '${method}' timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);

      this.pending.set(id, { resolve, reject, timer });

      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params });
      this.ws!.send(msg);
    });
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    if (this.reconnectAttempt >= this.options.maxReconnectAttempts) {
      this.options.onStatusChange("disconnected");
      return;
    }
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 15000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closed) {
        this.connect()
          .then(() => {
            this.sessionId = null;
            this.options.onReconnected();
          })
          .catch(() => {});
      }
    }, delay);
  }

  private clearPending(error: Error): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
