import { create } from "zustand";
import { AcpClient, chatModeToOptions, type PermissionRequestInfo, type ChatRunMode } from "../lib/acp-client";
import type { AcpConnectionStatus, TaskStreamNotification } from "../lib/acp-client";

export type ConnectionStatus = AcpConnectionStatus;

type EventCallback = (event: TaskStreamNotification) => void;

let acpInstance: AcpClient | null = null;

function getAcpClient(url: string, onEvent: EventCallback): AcpClient {
  if (!acpInstance) {
    acpInstance = new AcpClient({
      url,
      clientName: "vnt-agent-ui",
      onTaskEvent: onEvent,
      onStatusChange: (status) => {
        const store = useConnectionStore.getState();
        store.setStatus(status);
        if (status === "connected") {
          store.setError(null);
          store.setReconnectAttempts(0);
        } else if (status === "reconnecting") {
          store.setReconnectAttempts(store.reconnectAttempts + 1);
        }
      },
      onReconnected: async () => {
        const store = useConnectionStore.getState();
        try {
          const client = acpInstance;
          if (!client) return;
          const sessionId = await client.createSession({
            platform: "browser",
            supportsMarkdown: true,
          });
          store.setSessionId(sessionId);
          store.setStatus("connected");
          store.setError(null);
        } catch (err) {
          store.setError("Session recovery failed after reconnect");
        }
      },
    });
  }
  return acpInstance;
}

interface ConnectionState {
  status: ConnectionStatus;
  serverUrl: string | null;
  sessionId: string | null;
  error: string | null;
  reconnectAttempts: number;
  taskId: string | null;
  runId: string | null;

  // Actions
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  startTask: (prompt: string, opts?: { model?: string; mode?: ChatRunMode }) => Promise<{ taskId: string; runId: string }>;
  cancelTask: () => Promise<void>;
  ping: () => Promise<number>;
  listPermissions: (runId?: string) => Promise<PermissionRequestInfo[]>;
  replyPermission: (requestId: string, reply: "once" | "always" | "reject") => Promise<boolean>;
  setStatus: (status: ConnectionStatus) => void;
  setServerUrl: (url: string) => void;
  setSessionId: (id: string | null) => void;
  setError: (error: string | null) => void;
  setTaskId: (id: string | null) => void;
  setRunId: (id: string | null) => void;
  setReconnectAttempts: (n: number) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: "disconnected",
  serverUrl: null,
  sessionId: null,
  error: null,
  reconnectAttempts: 0,
  taskId: null,
  runId: null,

  connect: async (url?: string) => {
    const serverUrl = url ?? get().serverUrl ?? "ws://localhost:3101/acp";
    set({ serverUrl, error: null, status: "connecting" });

    try {
      const onEvent = (event: TaskStreamNotification) => {
        // Forward events to subscribers (used by useAcpStream hook)
        subscribers.forEach((cb) => cb(event));
      };

      const client = getAcpClient(serverUrl, onEvent);
      await client.connect();
      const sessionId = await client.createSession({
        platform: "browser",
        supportsMarkdown: true,
      });

      set({ sessionId, status: "connected", error: null, reconnectAttempts: 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      set({ status: "disconnected", error: message });
      throw err;
    }
  },

  disconnect: () => {
    set({ sessionId: null, taskId: null, runId: null, status: "disconnected" });
    acpInstance?.disconnect();
    acpInstance = null;
  },

  startTask: async (prompt, opts) => {
    const client = acpInstance;
    if (!client) throw new Error("Not connected");

    const modeOpts = chatModeToOptions(opts?.mode);
    const result = await client.startTask(prompt, {
      model: opts?.model,
      ...modeOpts,
    });
    set({ taskId: result.taskId, runId: result.runId });
    return result;
  },

  cancelTask: async () => {
    const taskId = get().taskId;
    if (!taskId) throw new Error("No active task");

    const client = acpInstance;
    if (!client) return;

    await client.cancelTask(taskId);
    set({ taskId: null, runId: null });
  },

  ping: async () => {
    const client = acpInstance;
    if (!client) throw new Error("Not connected");
    return client.ping();
  },

  listPermissions: async (runId?: string) => {
    const client = acpInstance;
    if (!client) throw new Error("Not connected");
    const result = await client.listPermissions(runId);
    return result.pending;
  },

  replyPermission: async (requestId, reply) => {
    const client = acpInstance;
    if (!client) throw new Error("Not connected");
    const result = await client.replyPermission(requestId, reply);
    return result.ok;
  },

  setStatus: (status) => set({ status }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setSessionId: (sessionId) => set({ sessionId }),
  setError: (error) => set({ error }),
  setTaskId: (taskId) => set({ taskId }),
  setRunId: (runId) => set({ runId }),
  setReconnectAttempts: (n) => set({ reconnectAttempts: n }),
}));

// Event subscription system
type Subscriber = (event: TaskStreamNotification) => void;
const subscribers = new Set<Subscriber>();

export function subscribeToAcpEvents(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}
