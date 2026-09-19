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
          "inline-flex h-9 w-[64px] items-center rounded-full border border-border bg-surface-hover/50 opacity-50",
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
        "group relative inline-flex h-9 w-[64px] items-center rounded-full border border-border bg-surface-hover/80 p-1 shadow-2xs transition-all duration-300 hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary active:scale-95",
        className
      )}
      title={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
    >
      <span className="sr-only">{isDark ? "Light Mode" : "Night Mode"}</span>

      {/* Track Background Icons */}
      <span className="flex w-full justify-between px-1.5 text-[10px] text-muted-foreground select-none pointer-events-none">
        <Sun
          className={cn(
            "h-3.5 w-3.5 transition-all duration-300",
            isDark ? "opacity-35 text-muted-foreground scale-90" : "opacity-0 scale-75"
          )}
        />
        <Moon
          className={cn(
            "h-3.5 w-3.5 transition-all duration-300",
            isDark ? "opacity-0 scale-75" : "opacity-35 text-muted-foreground scale-90"
          )}
        />
      </span>

      {/* Sliding Thumb Orb */}
      <span
        className={cn(
          "absolute flex h-7 w-7 items-center justify-center rounded-full shadow-md border transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark
            ? "left-[31px] bg-slate-900 border-indigo-500/30 text-indigo-400"
            : "left-1 bg-white border-amber-400/30 text-amber-500"
        )}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 animate-moon drop-shadow-[0_0_6px_rgba(129,140,248,0.7)]" />
        ) : (
          <Sun className="h-3.5 w-3.5 animate-sun drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
        )}
      </span>
    </button>
  );
}
