"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Library,
  MessageSquare,
  Settings,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { mainNavigation, type NavigationIcon } from "@/lib/navigation";
import { simpleAiApi, type AIStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const iconMap: Record<NavigationIcon, LucideIcon> = {
  MessageSquare,
  GraduationCap,
  Library,
  Settings,
};

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  useEffect(() => {
    simpleAiApi()
      .status()
      .then((data) => setAiStatus(data))
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="flex h-full flex-col">
      <Link href="/chat" className="flex items-center gap-3 px-5 py-5" onClick={onNavigate}>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-lg font-extrabold text-[#1f1b2d]">TaleForge</span>
          <span className="block text-xs font-medium text-muted-foreground">Self-Learning Story AI</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1.5 px-3 py-3" aria-label="Main navigation">
        {mainNavigation.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-[#eef2ff] text-[#3730a3]"
                  : "text-[#57534e] hover:bg-[#f4f1ec] hover:text-[#292524]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Model Status Card */}
      <div className="border-t border-border p-4">
        <div className="rounded-xl bg-[#fbfaf7] p-3.5 border border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#292524]">AI Memory Status</p>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {aiStatus
              ? `${aiStatus.total_trained_stories} stories learned`
              : "Ready to train"}
          </p>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-md px-2 py-1">
            <Zap className="h-3 w-3 text-amber-500" />
            Auto-Retrain Active
          </div>
        </div>
      </div>
    </div>
  );
}
