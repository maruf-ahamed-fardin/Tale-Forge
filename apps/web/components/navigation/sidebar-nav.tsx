"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  ClipboardCheck,
  Database,
  History,
  LayoutDashboard,
  Library,
  PenLine,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { mainNavigation, type NavigationIcon } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const iconMap: Record<NavigationIcon, LucideIcon> = {
  Activity,
  Boxes,
  ClipboardCheck,
  Database,
  History,
  LayoutDashboard,
  Library,
  PenLine,
  Settings,
};

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-3 px-5 py-5" onClick={onNavigate}>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-lg font-extrabold text-[#1f1b2d]">TaleForge</span>
          <span className="block text-xs font-medium text-muted-foreground">Your Voice. New Stories.</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-3" aria-label="Main navigation">
        {mainNavigation.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
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

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-[#fbfaf7] p-3">
          <p className="text-xs font-semibold text-[#292524]">Model Status</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#166534]">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            Ready shell
          </div>
        </div>
      </div>
    </div>
  );
}
