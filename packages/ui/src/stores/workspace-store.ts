import { create } from "zustand";

export interface WorkspaceInfo {
  id: string;
  root: string;
  name: string;
  addedAt: number;
  isActive: boolean;
}

interface WorkspaceState {
  workspaces: WorkspaceInfo[];
  activeRoot: string | null;
  loading: boolean;
  error: string | null;
  setWorkspaces: (workspaces: WorkspaceInfo[]) => void;
  setActiveRoot: (root: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeRoot: null,
  loading: false,
  error: null,
  setWorkspaces: (workspaces) =>
    set({
      workspaces,
      activeRoot: workspaces.find((w) => w.isActive)?.root ?? null,
    }),
  setActiveRoot: (activeRoot) => set({ activeRoot }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clear: () => set({ workspaces: [], activeRoot: null, loading: false, error: null }),
}));
