"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeftOpen, Plus, X } from "lucide-react";

import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { buttonVariants } from "@/components/ui/button";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tf_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tf_sidebar_collapsed", String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {/* Permanent Desktop Sticky Sidebar - Collapsible with smooth transition */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-surface lg:block lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden z-20 transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[280px]"
        )}
      >
        <SidebarNav collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>

      <div className="min-w-0 flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-lg shadow-xs border border-indigo-200/60">
              <img
                src="/favicon.svg"
                alt="TaleForge Logo"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="text-base font-extrabold text-foreground">TaleForge</span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-hover"
              aria-label={t("nav.openMenu", undefined, "Open navigation")}
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Mobile Overlay */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setOpen(false)}
        />

        {/* Mobile Drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(86vw,320px)] border-r border-border bg-surface shadow-xl transition-transform duration-200 lg:hidden flex flex-col h-full overflow-hidden",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            aria-label={t("nav.closeMenu", undefined, "Close navigation")}
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex-1 overflow-hidden h-full">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </aside>

        {/* Sticky Desktop Header */}
        <header className="sticky top-0 z-10 hidden h-16 items-center justify-between border-b border-border bg-surface/90 px-6 backdrop-blur lg:flex">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
              title={collapsed ? t("nav.expandSidebar", undefined, "Expand sidebar") : t("nav.collapseSidebar", undefined, "Collapse sidebar")}
              aria-label={collapsed ? t("nav.expandSidebar", undefined, "Expand sidebar") : t("nav.collapseSidebar", undefined, "Collapse sidebar")}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t("nav.creativeWorkspace", undefined, "Creative Workspace")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("nav.workspaceSubtitle", undefined, "Personalized AI Storytelling Platform")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/studio"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              {t("nav.newStory", undefined, "New Story")}
            </Link>
          </div>
        </header>

        {/* Scrollable Main Content Area */}
        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
