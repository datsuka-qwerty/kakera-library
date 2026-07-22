import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../lib/i18n";
import { setNativeLocale } from "../lib/localeModule";

type Lang = "ja" | "en";

interface LanguageState {
  language: Lang;
  setLanguage: (lang: Lang) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "ja",
      setLanguage: (language) => {
        i18n.changeLanguage(language);
        setNativeLocale(language);
        set({ language });
      },
    }),
    {
      name: "kakera-language",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);
