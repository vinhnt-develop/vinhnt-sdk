import { create } from "zustand";
import { subscribeToAcpEvents } from "./connection-store";
import type { TaskStreamNotification, PermissionRequestInfo } from "../lib/acp-client";

interface PermissionState {
  pending: PermissionRequestInfo[];
  loading: boolean;

  setPending: (requests: PermissionRequestInfo[]) => void;
  addPending: (request: PermissionRequestInfo) => void;
  removePending: (id: string) => void;
  clear: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  pending: [],
  loading: false,

  setPending: (pending) => set({ pending, loading: false }),
  addPending: (request) => {
    const existing = get().pending.find((r) => r.id === request.id);
    if (!existing) {
      set({ pending: [...get().pending, request] });
    }
  },
  removePending: (id) => set({ pending: get().pending.filter((r) => r.id !== id) }),
  clear: () => set({ pending: [], loading: false }),
}));

// Auto-subscribe to ACP events — listen for permission notifications
let subscribed = false;
export function initPermissionListener(): () => void {
  if (subscribed) return () => {};
  subscribed = true;

  const unsubscribe = subscribeToAcpEvents((event: TaskStreamNotification) => {
    if (event.type === "permission") {
      const req = event.data as PermissionRequestInfo;
      if (req?.id) {
        usePermissionStore.getState().addPending(req);
      }
    }
    if (event.type === "permission_reply") {
      const data = event.data as { requestId?: string };
      if (data?.requestId) {
        usePermissionStore.getState().removePending(data.requestId);
      }
    }
  });

  return () => {
    subscribed = false;
    unsubscribe();
  };
}
