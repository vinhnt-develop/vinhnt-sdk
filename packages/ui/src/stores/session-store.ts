import { create } from "zustand";

export interface SessionInfo {
  id: string;
  title: string;
  parentId?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

interface SessionState {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  loading: boolean;
  setSessions: (sessions: SessionInfo[]) => void;
  addSession: (session: SessionInfo) => void;
  removeSession: (id: string) => void;
  updateSession: (id: string, updates: Partial<SessionInfo>) => void;
  setActiveSessionId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((s) => ({ sessions: [...s.sessions, session] })),
  removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((si) => si.id !== id) })),
  updateSession: (id, updates) =>
    set((s) => ({
      sessions: s.sessions.map((si) => (si.id === id ? { ...si, ...updates } : si)),
    })),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setLoading: (loading) => set({ loading }),
}));
