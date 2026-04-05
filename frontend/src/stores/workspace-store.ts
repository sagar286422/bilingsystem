import { create, type StateCreator } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceState = {
  activeOrganizationId: string | null;
  setActiveOrganizationId: (id: string | null) => void;
};

const workspaceSlice: StateCreator<WorkspaceState> = (set) => ({
  activeOrganizationId: null,
  setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),
});

/**
 * Client workspace prefs (e.g. active org). TanStack Query handles server data;
 * Zustand holds durable UI scope selection.
 */
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(workspaceSlice, { name: "billing-workspace" }),
);
