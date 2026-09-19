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
    <div className="flex h-full flex-col bg-surface transition-colors select-none">
      {/* Header */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-2.5 px-2 py-4 shrink-0 border-b border-border/50">
          <Link
            href="/chat"
            className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-md border border-indigo-200/60 dark:border-indigo-800/40 hover:scale-105 transition-transform"
            onClick={onNavigate}
            title={t("nav.appName", undefined, "TaleForge")}
          >
            <img
              src="/favicon.svg"
              alt="TaleForge Logo"
              className="h-full w-full object-cover"
            />
          </Link>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
              title={t("nav.expandSidebar", undefined, "Expand sidebar")}
              aria-label={t("nav.expandSidebar", undefined, "Expand sidebar")}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-4 shrink-0 border-b border-border/50">
          <Link
            href="/chat"
            className="flex items-center gap-3 overflow-hidden min-w-0"
            onClick={onNavigate}
          >
            <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-md border border-indigo-200/60 dark:border-indigo-800/40">
              <img
                src="/favicon.svg"
                alt="TaleForge Logo"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="truncate">
              <span className="block text-lg font-extrabold text-foreground leading-tight truncate">
                {t("nav.appName", undefined, "TaleForge")}
              </span>
              <span className="block text-xs font-medium text-muted-foreground truncate">
                {t("nav.appTagline", undefined, "Self-Learning Story AI")}
              </span>
            </span>
          </Link>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors ml-1"
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
          "flex-1 space-y-1.5 overflow-y-auto",
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
                "group flex items-center font-semibold transition-all",
                collapsed
                  ? "justify-center rounded-xl p-2.5"
                  : "gap-3 rounded-lg px-3.5 py-2.5 text-sm",
                active
                  ? "bg-primary/10 text-primary dark:bg-indigo-950/60 dark:text-indigo-300 shadow-xs"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "shrink-0 transition-transform group-hover:scale-110",
                  collapsed ? "h-5 w-5" : "h-4 w-4"
                )}
                aria-hidden="true"
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Model Status Card */}
      {collapsed ? (
        <div className="border-t border-border p-2.5 shrink-0 flex justify-center">
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
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-surface animate-pulse" />
          </Link>
        </div>
      ) : (
        <div className="border-t border-border p-4 shrink-0">
          <Link
            href="/train"
            onClick={onNavigate}
            className="block rounded-xl bg-surface-hover/60 p-3.5 border border-border hover:border-primary/40 hover:shadow-xs transition"
            title={t("nav.goToTraining", undefined, "Go to AI Training Hub")}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">
                {t("nav.aiMemoryStatus", undefined, "AI Memory Status")}
              </p>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
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
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-md px-2 py-1">
              <Zap className="h-3 w-3 text-amber-500" />
              {t("nav.autoRetrainActive", undefined, "Auto-Retrain Active")}
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
