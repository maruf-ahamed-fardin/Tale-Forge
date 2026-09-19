"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground opacity-50",
          className
        )}
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-surface-hover hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-primary",
        showLabel ? "px-3 py-1.5 text-xs font-semibold" : "h-9 w-9",
        className
      )}
      title={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-600 transition-transform rotate-0 scale-100" />
      )}
      {showLabel && (
        <span>{isDark ? "Light Mode" : "Night Mode"}</span>
      )}
    </button>
  );
}
