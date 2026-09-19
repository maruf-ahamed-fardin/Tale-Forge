"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, type Language } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default language is English ("en")
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tf_lang") as Language | null;
      if (stored === "en" || stored === "bn") {
        setLanguageState(stored);
      } else {
        // Fallback default: English
        setLanguageState("en");
      }
    } catch {
      // Ignore storage errors
    }
    setMounted(true);
  }, []);

  const setLanguage = (newLang: Language) => {
    if (newLang === language) return;

    const updateLang = () => {
      setLanguageState(newLang);
      try {
        localStorage.setItem("tf_lang", newLang);
        if (typeof document !== "undefined") {
          document.documentElement.lang = newLang;
        }
      } catch {
        // Ignore storage errors
      }
    };

    // Use native View Transitions API for smooth language cross-fade if supported
    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(updateLang);
    } else {
      updateLang();
    }
  };

  useEffect(() => {
    if (mounted && typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language, mounted]);

  const t = (path: string, params?: Record<string, string | number>, fallback?: string): string => {
    const keys = path.split(".");
    let current: any = translations[language] || translations.en;

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        // Fallback to English dictionary if key not found in current language
        let enCurrent: any = translations.en;
        for (const enKey of keys) {
          if (enCurrent && typeof enCurrent === "object" && enKey in enCurrent) {
            enCurrent = enCurrent[enKey];
          } else {
            enCurrent = undefined;
            break;
          }
        }
        current = enCurrent ?? fallback ?? path;
        break;
      }
    }

    if (typeof current !== "string") {
      return fallback ?? path;
    }

    if (params) {
      let result = current;
      for (const [paramKey, paramVal] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
      }
      return result;
    }

    return current;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
