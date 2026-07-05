import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../lib/i18n";

type Lang = "ja" | "en";
const SUPPORTED: Lang[] = ["ja", "en"];

interface LanguageState {
  language: Lang;
  lastOSLocale: string;
  setLanguage: (lang: Lang) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "ja",
      lastOSLocale: "",
      setLanguage: (language) => {
        i18n.changeLanguage(language);
        set({ language });
      },
    }),
    {
      name: "kakera-language",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) i18n.changeLanguage(state.language);
      },
    }
  )
);
