"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language, TranslationKey } from "@/lib/translations";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "de",
  setLang: () => {},
  t: (key) => translations.de[key],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("de");

  // Load language from localStorage on first mount
  useEffect(() => {
    const stored = localStorage.getItem("app-language") as Language | null;
    if (stored === "en" || stored === "de") {
      setLangState(stored);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("app-language", newLang);
  };

  const t = (key: TranslationKey): string => translations[lang][key];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
