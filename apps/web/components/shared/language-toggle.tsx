"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
  variant?: "compact" | "full";
}

export function LanguageToggle({ className, variant = "compact" }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  if (variant === "full") {
    return (
      <div
        className={cn(
          "relative inline-flex items-center rounded-xl border border-border bg-surface-hover/80 p-1 shadow-2xs select-none",
          className
        )}
      >
        {/* Sliding Indicator Pill for Full Variant */}
        <div
          className={cn(
            "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-primary shadow-xs transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            language === "en" ? "left-1" : "left-[calc(50%+0px)]"
          )}
        />

        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={cn(
            "relative z-10 flex-1 px-4 py-2 text-xs font-semibold transition-colors duration-200 text-center",
            language === "en" ? "text-white font-bold" : "text-muted-foreground hover:text-foreground"
          )}
          title="English"
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLanguage("bn")}
          className={cn(
            "relative z-10 flex-1 px-4 py-2 text-xs font-semibold transition-colors duration-200 text-center",
            language === "bn" ? "text-white font-bold" : "text-muted-foreground hover:text-foreground"
          )}
          title="বাংলা (Bangla)"
        >
          বাংলা
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative inline-flex h-9 items-center rounded-lg border border-border bg-surface-hover/80 p-0.5 shadow-2xs select-none",
        className
      )}
    >
      {/* Sliding Active Indicator Pill */}
      <div
        className={cn(
          "absolute top-1 bottom-1 rounded-md bg-primary shadow-xs transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          language === "en" ? "left-1 w-[32px]" : "left-[37px] w-[36px]"
        )}
      />

      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={cn(
          "relative z-10 h-7 w-[32px] flex items-center justify-center text-xs font-extrabold transition-colors duration-200",
          language === "en" ? "text-white" : "text-muted-foreground hover:text-foreground"
        )}
        title="Switch to English"
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("bn")}
        className={cn(
          "relative z-10 h-7 w-[36px] flex items-center justify-center text-xs font-extrabold transition-colors duration-200",
          language === "bn" ? "text-white" : "text-muted-foreground hover:text-foreground"
        )}
        title="বাংলা ভাষায় পরিবর্তন করুন"
        aria-label="বাংলা ভাষায় পরিবর্তন করুন"
      >
        বাং
      </button>
    </div>
  );
}
