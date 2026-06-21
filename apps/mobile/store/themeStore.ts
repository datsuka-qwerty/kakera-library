import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ACCENT_PRESETS = [
  { label: "ダーク",    value: "#111827" },
  { label: "スレート",  value: "#475569" },
  { label: "ブルー",    value: "#1D4ED8" },
  { label: "グリーン",  value: "#047857" },
  { label: "パープル",  value: "#6D28D9" },
  { label: "ローズ",    value: "#BE123C" },
  { label: "アンバー",  value: "#92400E" },
];

interface ThemeState {
  accentColor: string;
  setAccentColor: (color: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accentColor: "#111827",
      setAccentColor: (color) => set({ accentColor: color }),
    }),
    { name: "kakera-theme", storage: createJSONStorage(() => AsyncStorage) }
  )
);

export function useAccent() {
  return useThemeStore((s) => s.accentColor);
}
