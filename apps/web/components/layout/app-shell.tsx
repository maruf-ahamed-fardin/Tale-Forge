"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Plus, Sparkles, X } from "lucide-react";

import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-white lg:block">
        <SidebarNav />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/92 px-4 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-lg shadow-sm border border-indigo-200/60">
              <img
                src="/favicon.svg"
                alt="TaleForge Logo"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="text-base font-extrabold text-[#1f1b2d]">TaleForge</span>
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-[#44403c]"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div
          className={cn(
            "fixed inset-0 z-40 bg-[#1f1b2d]/30 backdrop-blur-sm transition-opacity lg:hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setOpen(false)}
        />

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(86vw,320px)] border-r border-border bg-white transition-transform duration-200 lg:hidden",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#57534e] hover:bg-[#f4f1ec]"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </aside>

        <header className="hidden h-16 items-center justify-between border-b border-border bg-white/92 px-8 backdrop-blur lg:flex">
          <div>
            <p className="text-sm font-semibold text-[#292524]">Creative Workspace</p>
            <p className="text-xs text-muted-foreground">Phase 2 frontend shell</p>
          </div>
          <Link href="/studio" className={buttonVariants({ size: "sm" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Story
          </Link>
        </header>

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
