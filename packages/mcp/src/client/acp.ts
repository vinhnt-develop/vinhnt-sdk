import {
  JsonRpcSuccessSchema,
  JsonRpcErrorSchema,
  JsonRpcNotificationSchema,
  AcpMethods,
} from "./acp-types.js";
import type { SessionCreateParams, TaskStartParams, TaskStreamNotification } from "./acp-types.js";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export type { TaskStreamNotification } from "./acp-types.js";

export type TaskEventHandler = (event: TaskStreamNotification) => void;

/**
 * Default ACP WebSocket URL — convenience only.
 * User tự inject URL: `new AcpClient({ url: userConfig.acpUrl })`
 */
export const DEFAULT_ACP_URL = "ws://localhost:3101/acp";

/**
 * Default ACP client name — convenience only.
 * User tự inject: `new AcpClient({ clientName: "my-app" })`
 */
export const DEFAULT_ACP_CLIENT_NAME = "vnt-agent-acp";

/**
 * Default ACP request timeout — convenience only.
 */
export const DEFAULT_ACP_TIMEOUT = 30000;

export interface AcpClientOptions {
  /** WebSocket URL — user inject URL */
  url?: string;
  clientId?: string;
  clientName?: string;
  /** Request timeout in ms */
  timeout?: number;
  onTaskEvent?: TaskEventHandler;
  onDisconnect?: () => void;
}

export class AcpClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string | number, PendingRequest>();
  private requestId = 0;
  private sessionId: string | null = null;
  private connected = false;
  private options: Required<AcpClientOptions>;
  private closed = false;
  private reconnectAttempt = 0;

  constructor(opts: AcpClientOptions = {}) {
    this.options = {
      url: DEFAULT_ACP_URL,
      clientId: crypto.randomUUID(),
      clientName: DEFAULT_ACP_CLIENT_NAME,
      timeout: DEFAULT_ACP_TIMEOUT,
      onTaskEvent: () => {},
      onDisconnect: () => {},
      ...opts,
    };
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (typeof WebSocket === "undefined") {
      throw new Error("WebSocket not available in this environment");
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.options.url);
      const ws = this.ws as unknown as EventTarget & { close: () => void };

      ws.addEventListener("open", () => {
        this.connected = true;
        this.reconnectAttempt = 0;
        resolve();
      });

      ws.addEventListener("message", ((ev: Event) => {
        const msgEvent = ev as MessageEvent;
        const raw = msgEvent.data;
        let msg: unknown;
        try {
          msg = JSON.parse(typeof raw === "string" ? raw : Buffer.from(raw).toString("utf-8"));
        } catch {
          return;
        }

        if (msg && typeof msg === "object" && !("id" in (msg as Record<string, unknown>))) {
          const parsed = JsonRpcNotificationSchema.safeParse(msg);
          if (parsed.success) {
            this.handleNotification(parsed.data.method, parsed.data.params);
          }
          return;
        }

        if (msg && typeof msg === "object" && "id" in (msg as Record<string, unknown>)) {
          const success = JsonRpcSuccessSchema.safeParse(msg);
          if (success.success) {
            const id = success.data.id;
            if (id === null || id === undefined) return;
            const pending = this.pending.get(id);
            if (pending) {
              clearTimeout(pending.timer);
              this.pending.delete(id);
              pending.resolve(success.data.result);
            }
            return;
          }

          const errMsg = JsonRpcErrorSchema.safeParse(msg);
          if (errMsg.success) {
            const id = errMsg.data.id;
            if (id === null || id === undefined) return;
            const pending = this.pending.get(id);
            if (pending) {
              clearTimeout(pending.timer);
              this.pending.delete(id);
              pending.reject(new Error(`ACP error ${errMsg.data.error.code}: ${errMsg.data.error.message}`));
            }
            return;
          }
        }
      }) as EventListener);

      ws.addEventListener("close", () => {
        this.connected = false;
        this.options.onDisconnect();
        if (!this.closed) this.scheduleReconnect();
      });

      ws.addEventListener("error", () => {
        if (!this.connected) {
          reject(new Error("WebSocket connection failed"));
        }
      });
    });
  }

  disconnect(): void {
    this.closed = true;
    this.connected = false;
    this.clearPending(new Error("Disconnected"));
    this.ws?.close();
    this.ws = null;
  }

  get isConnected(): boolean { return this.connected; }
  get currentSessionId(): string | null { return this.sessionId; }

  async createSession(caps?: SessionCreateParams["capabilities"]): Promise<string> {
    const params: SessionCreateParams = {
      clientId: this.options.clientId,
      clientName: this.options.clientName,
      capabilities: caps,
    };

    const result = await this.request(AcpMethods.SessionCreate, params) as { sessionId: string };
    this.sessionId = result.sessionId;
    return result.sessionId;
  }

  async startTask(prompt: string, opts?: Partial<TaskStartParams>): Promise<{ taskId: string; runId: string }> {
    if (!this.sessionId) throw new Error("No active session. Call createSession() first.");

    const result = await this.request(AcpMethods.TaskStart, {
      sessionId: this.sessionId,
      prompt,
      ...opts,
    } as TaskStartParams) as { taskId: string; runId: string };

    return result;
  }

  async cancelTask(taskId: string, reason?: string): Promise<boolean> {
    const result = await this.request(AcpMethods.TaskCancel, { taskId, reason }) as { ok: boolean };
    return result.ok;
  }

  async ping(): Promise<number> {
    const result = await this.request(AcpMethods.Ping, {}) as { timestamp: number };
    return result.timestamp;
  }

  private async request(method: string, params: unknown): Promise<unknown> {
    if (!this.ws || !this.connected) throw new Error("Not connected");

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

  private handleNotification(method: string, params: unknown): void {
    if (method === "task/stream") {
      this.options.onTaskEvent(params as TaskStreamNotification);
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 15000);
    this.reconnectAttempt++;
    setTimeout(() => {
      if (!this.closed) {
        this.connect().catch(() => {});
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
