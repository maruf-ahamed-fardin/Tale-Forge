import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-extrabold text-[#1f1b2d]">TaleForge</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
