"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Library,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { mainNavigation, type NavigationIcon } from "@/lib/navigation";
import { simpleAiApi, type AIStatus } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const iconMap: Record<NavigationIcon, LucideIcon> = {
  MessageSquare,
  GraduationCap,
  Library,
  Settings,
};

export interface SidebarNavProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarNav({ onNavigate, collapsed = false, onToggleCollapse }: SidebarNavProps) {
  const pathname = usePathname();
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    simpleAiApi()
      .status()
      .then((data) => setAiStatus(data))
      .catch(() => {});
  }, [pathname]);

  const getTranslatedLabel = (href: string, fallback: string) => {
    switch (href) {
      case "/chat":
        return t("nav.chat", undefined, fallback);
      case "/train":
        return t("nav.train", undefined, fallback);
      case "/stories":
        return t("nav.stories", undefined, fallback);
      case "/settings":
        return t("nav.settings", undefined, fallback);
      default:
        return fallback;
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface/80 backdrop-blur-xl transition-colors select-none">
      {/* Brand Header */}
      {collapsed ? (
        <div className="flex items-center justify-between px-3 py-4 shrink-0 border-b border-border/60">
          <Link
            href="/chat"
            className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-xl bg-gradient-radiant p-1.5 shadow-radiant hover:scale-105 transition-transform"
            onClick={onNavigate}
            title={t("nav.appName", undefined, "TaleForge")}
          >
            <img
              src="/favicon.svg"
              alt="TaleForge Logo"
              className="h-full w-full object-contain filter drop-shadow"
            />
          </Link>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
              title={t("nav.expandSidebar", undefined, "Expand sidebar")}
              aria-label={t("nav.expandSidebar", undefined, "Expand sidebar")}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-4 shrink-0 border-b border-border/60">
          <Link
            href="/chat"
            className="flex items-center gap-3 overflow-hidden min-w-0 group"
            onClick={onNavigate}
          >
            <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gradient-radiant p-1.5 shadow-radiant group-hover:scale-105 transition-transform">
              <img
                src="/favicon.svg"
                alt="TaleForge Logo"
                className="h-full w-full object-contain filter drop-shadow"
              />
            </span>
            <span className="truncate">
              <span className="block font-display text-lg font-extrabold text-foreground tracking-tight leading-tight truncate">
                {t("nav.appName", undefined, "TaleForge")}
              </span>
              <span className="block text-[11px] font-medium text-muted-foreground truncate">
                {t("nav.appTagline", undefined, "Self-Learning Story AI")}
              </span>
            </span>
          </Link>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors ml-1"
              title={t("nav.collapseSidebar", undefined, "Collapse sidebar")}
              aria-label={t("nav.collapseSidebar", undefined, "Collapse sidebar")}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Nav Links */}
      <nav
        className={cn(
          "flex-1 space-y-1 overflow-y-auto",
          collapsed ? "px-2 py-3" : "px-3 py-3"
        )}
        aria-label="Main navigation"
      >
        {mainNavigation.map((item) => {
          const Icon = iconMap[item.icon];
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const label = getTranslatedLabel(item.href, item.label);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={label}
              className={cn(
                "group flex items-center font-semibold transition-all relative",
                collapsed
                  ? "justify-center rounded-xl p-2.5"
                  : "gap-3 rounded-xl px-3.5 py-2.5 text-sm",
                active
                  ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary dark:text-indigo-300 border-l-2 border-primary shadow-xs"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground hover:translate-x-0.5"
              )}
            >
              <Icon
                className={cn(
                  "shrink-0 transition-transform group-hover:scale-110",
                  collapsed ? "h-5 w-5" : "h-4 w-4",
                  active ? "text-primary dark:text-indigo-400" : "text-muted-foreground group-hover:text-foreground"
                )}
                aria-hidden="true"
              />
              {!collapsed && (
                <span className="truncate flex-1">{label}</span>
              )}
              {!collapsed && item.href === "/chat" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-radiant text-white shadow-xs">
                  Pro
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Memory Status Card */}
      {collapsed ? (
        <div className="border-t border-border/60 p-2.5 shrink-0 flex justify-center">
          <Link
            href="/train"
            onClick={onNavigate}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-hover/80 border border-border hover:border-primary/40 transition group"
            title={`${t("nav.aiMemoryStatus", undefined, "AI Memory Status")}: ${
              aiStatus
                ? `${aiStatus.personal_trained_stories ?? 0} Personal / ${aiStatus.default_stories_count ?? 6} Default Stories`
                : "Ready"
            } (${t("nav.autoRetrainActive", undefined, "Auto-Retrain Active")})`}
          >
            <Zap className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-surface animate-pulse shadow-sm" />
          </Link>
        </div>
      ) : (
        <div className="border-t border-border/60 p-3.5 shrink-0">
          <Link
            href="/train"
            onClick={onNavigate}
            className="block rounded-2xl bg-surface/90 p-3.5 border border-border hover:border-primary/40 hover:shadow-card-elevated transition-all group"
            title={t("nav.goToTraining", undefined, "Go to AI Training Hub")}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t("nav.aiMemoryStatus", undefined, "AI Memory Core")}
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {aiStatus
                ? t(
                    "nav.memoryCount",
                    {
                      personal: aiStatus.personal_trained_stories ?? 0,
                      defaults: aiStatus.default_stories_count ?? 6,
                    },
                    `${aiStatus.personal_trained_stories ?? 0} Personal / ${aiStatus.default_stories_count ?? 6} Default Stories`
                  )
                : t("nav.readyToTrain", undefined, "Ready to train")}
            </p>
            {/* Memory Capacity Bar */}
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full bg-gradient-radiant rounded-full transition-all duration-500"
                style={{
                  width: aiStatus?.personal_trained_stories ? `${Math.min(100, 40 + (aiStatus.personal_trained_stories * 15))}%` : "35%",
                }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Zap className="h-3 w-3 text-amber-500" />
                {t("nav.autoRetrainActive", undefined, "Auto-Retrain Active")}
              </span>
              <span className="text-[10px] text-muted-foreground">98% Match</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
