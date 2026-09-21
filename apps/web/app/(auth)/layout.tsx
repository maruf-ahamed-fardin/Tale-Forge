import Link from "next/link";
import { Sparkles } from "lucide-react";

import { LanguageToggle } from "@/components/shared/language-toggle";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="relative flex h-full min-h-[100dvh] w-full flex-col items-center justify-between overflow-y-auto overflow-x-hidden bg-background px-4 py-6 sm:py-10">
      {/* Top bar with language and theme toggles */}
      <div className="w-full max-w-md flex justify-end items-center gap-2 pb-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="my-auto w-full max-w-md py-4">
        <Link href="/" className="mb-6 sm:mb-8 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-radiant text-white shadow-radiant">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-extrabold text-foreground tracking-tight">TaleForge</span>
        </Link>
        {children}
      </div>

      {/* Minimal copyright/footer */}
      <footer className="pt-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TaleForge. All rights reserved.
      </footer>
    </main>
  );
}
