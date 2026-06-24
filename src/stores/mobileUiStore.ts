import { create } from "zustand";

type MobileTab = "search" | "queue";

interface MobileUiState {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
}

export const useMobileUiStore = create<MobileUiState>((set) => ({
  activeTab: "search",
  setActiveTab: (activeTab) => set({ activeTab }),
}));

