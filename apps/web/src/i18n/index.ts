import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ja from "./locales/ja.json";
import en from "./locales/en.json";
import { LANGUAGES } from "../lib/languages";

const STORAGE_KEY = "kakera-lang";
const SUPPORTED = LANGUAGES.map((l) => l.code);

const saved = localStorage.getItem(STORAGE_KEY);
const browserLang = SUPPORTED.find((code) => navigator.language.startsWith(code)) ?? SUPPORTED[0];
const lng = saved && SUPPORTED.includes(saved) ? saved : browserLang;

i18n.use(initReactI18next).init({
  resources: {
    ja: { translation: ja },
    en: { translation: en },
  },
  lng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lang) => {
  localStorage.setItem(STORAGE_KEY, lang);
});

export default i18n;
