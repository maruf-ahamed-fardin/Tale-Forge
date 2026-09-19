"use client";

import React from "react";
import { Globe } from "lucide-react";
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
      <div className={cn("inline-flex items-center rounded-lg border border-border bg-surface p-1 shadow-2xs", className)}>
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
            language === "en"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          )}
          title="English"
        >
          <span>English</span>
        </button>
        <button
          type="button"
          onClick={() => setLanguage("bn")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
            language === "bn"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          )}
          title="বাংলা (Bangla)"
        >
          <span>বাংলা</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-surface p-0.5 shadow-2xs",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={cn(
          "rounded-md px-2 py-1 text-xs font-bold transition-all",
          language === "en"
            ? "bg-primary text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
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
          "rounded-md px-2 py-1 text-xs font-bold transition-all",
          language === "bn"
            ? "bg-primary text-white shadow-xs"
            : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
        )}
        title="বাংলা ভাষায় পরিবর্তন করুন"
        aria-label="বাংলা ভাষায় পরিবর্তন করুন"
      >
        বাং
      </button>
    </div>
  );
}
