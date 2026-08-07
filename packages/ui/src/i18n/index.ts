import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import vi from "./locales/vi.json";

const SUPPORTED_LANGUAGES = ["en", "vi"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

function detectLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("vnt-language");
  if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) return stored as Language;
  const browserLang = navigator.language?.split("-")[0];
  if (browserLang && SUPPORTED_LANGUAGES.includes(browserLang as Language)) return browserLang as Language;
  return "en";
}

export function setupI18n(language?: Language) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, vi: { translation: vi } },
    lng: language ?? detectLanguage(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return i18n;
}

export function changeLanguage(lang: Language) {
  localStorage.setItem("vnt-language", lang);
  i18n.changeLanguage(lang);
}

export { i18n };
