"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, Plus, X } from "lucide-react";

import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();
  const pathname = usePathname();
  const isChat = pathname === "/chat" || pathname === "/" || pathname?.startsWith("/chat");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tf_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      } else if (typeof window !== "undefined" && window.innerWidth < 1024) {
        // Default to clean collapsed icon sidebar on tablet screens (768px-1023px)
        setCollapsed(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Ensure the browser window itself is pinned at (0, 0) and cannot drift on mobile
  useEffect(() => {
    const resetScroll = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("scroll", resetScroll, { passive: true });
    return () => window.removeEventListener("scroll", resetScroll);
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
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-background text-foreground flex relative">
      {/* Ambient Glow Lights for rich atmospheric feel */}
      <div className="ambient-glow-mesh pointer-events-none" />
      <div className="ambient-glow-mesh-2 pointer-events-none" />

      {/* Permanent Desktop/Tablet Sticky Sidebar - Collapsible with smooth transition */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border/70 bg-surface/70 backdrop-blur-2xl md:block h-full max-h-full z-20 transition-all duration-300 ease-in-out relative group/sidebar",
          collapsed ? "w-[72px]" : "w-[270px]"
        )}
      >
        <div className="h-full w-full overflow-hidden">
          <SidebarNav collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </div>

        {/* Edge / Border Collapse Toggle Button ("akdom side a") */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="absolute -right-3.5 top-5 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-surface text-muted-foreground shadow-md hover:bg-surface-hover hover:text-foreground hover:border-primary/50 hover:scale-110 active:scale-95 transition-all"
          title={collapsed ? t("nav.expandSidebar", undefined, "Expand sidebar") : t("nav.collapseSidebar", undefined, "Collapse sidebar")}
          aria-label={collapsed ? t("nav.expandSidebar", undefined, "Expand sidebar") : t("nav.collapseSidebar", undefined, "Collapse sidebar")}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col h-full max-h-full overflow-hidden relative z-10">
        {/* Mobile Header (Phones < 768px) */}
        <header className="shrink-0 sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-surface/80 px-2.5 xs:px-3 sm:px-4 backdrop-blur-xl md:hidden">
          <Link href="/" className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 min-w-0 shrink">
            <span className="relative flex h-7 w-7 shrink-0 overflow-hidden rounded-xl bg-gradient-radiant p-1 shadow-radiant">
              <img
                src="/favicon.svg"
                alt="TaleForge Logo"
                className="h-full w-full object-contain filter drop-shadow"
              />
            </span>
            <span className="font-display text-xs xs:text-sm font-extrabold text-foreground truncate max-w-[120px] xs:max-w-[180px]">
              TaleForge
            </span>
          </Link>

          <div className="flex items-center gap-1 xs:gap-1.5 shrink-0">
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:bg-surface-hover active:scale-95 transition-all"
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
            "fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-200 md:hidden",
            open ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        {/* Mobile Drawer */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(88vw,320px)] border-r border-border bg-surface/95 backdrop-blur-2xl shadow-2xl transition-transform duration-250 ease-out md:hidden flex flex-col h-full overflow-hidden",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-hover hover:text-foreground active:scale-95 transition-all"
            aria-label={t("nav.closeMenu", undefined, "Close navigation")}
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex-1 overflow-y-auto h-full">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </aside>

        {/* Tablet & Desktop Header (the chat page renders its own single header) */}
        {!isChat && (
          <header className="shrink-0 z-10 hidden h-14 md:h-16 items-center justify-between border-b border-border/70 bg-surface/75 px-4 md:px-5 lg:px-6 backdrop-blur-xl md:flex">
            <div className="truncate">
              <p className="text-sm font-bold text-foreground leading-tight truncate">
                {t("nav.creativeWorkspace", undefined, "Creative Workspace")}
              </p>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {t("nav.workspaceSubtitle", undefined, "Personalized AI Storytelling Platform")}
              </p>
            </div>

            <div className="flex items-center gap-2 lg:gap-3 shrink-0">
              <LanguageToggle />
              <ThemeToggle />
              <Link
                href="/studio"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 active:scale-[0.98] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("nav.openStudio", undefined, "Open Studio")}</span>
              </Link>
            </div>
          </header>
        )}

        {/* Workspace Main Content Area */}
        <main
          className={cn(
            "flex-1 min-h-0 min-w-0 flex flex-col",
            isChat
              ? "overflow-hidden p-0"
              : "overflow-y-auto px-3 py-3.5 xs:px-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
