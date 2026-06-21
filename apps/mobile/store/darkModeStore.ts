import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

interface DarkModeState {
  isDark: boolean;
  setDark: (dark: boolean) => void;
}

export const useDarkModeStore = create<DarkModeState>()(
  persist(
    (set) => ({
      isDark: Appearance.getColorScheme() === "dark",
      setDark: (isDark) => set({ isDark }),
    }),
    {
      name: "kakera-dark-mode",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
