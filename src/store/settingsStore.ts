import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  dark: boolean;
  setDark: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      dark: false,
      setDark: (v) => set({ dark: v }),
    }),
    { name: "settings-shell" }
  )
);
