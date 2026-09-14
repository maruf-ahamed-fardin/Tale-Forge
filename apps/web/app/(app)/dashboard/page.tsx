import Link from "next/link";
import { ArrowUpRight, BookOpen, Library, PenLine, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Stories created", value: "0" },
  { label: "Words generated", value: "0" },
  { label: "Favorite genre", value: "None" },
  { label: "Generation count", value: "0" },
];

export default function DashboardPage() {
  return (
    <section>
      <PageHeader title="Good evening." description="Ready to create something new?">
        <Link href="/studio" className={buttonVariants()}>
          <PenLine className="h-4 w-4" aria-hidden="true" />
          New Story
        </Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Recent Stories</CardTitle>
                <CardDescription>Your saved drafts will appear here.</CardDescription>
              </div>
              <Library className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-[#fbfaf7] p-6 text-center">
              <BookOpen className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="mt-3 font-semibold text-[#292524]">No stories yet</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                Start with a genre, theme, mood, setting, and a few characters.
              </p>
              <Link href="/studio" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>
                Open Studio
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>TaleForge Model</CardTitle>
            <CardDescription>Local model integration will connect in a later phase.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-4">
              <div>
                <p className="text-sm font-semibold text-[#166534]">Ready</p>
                <p className="text-xs text-[#3f7650]">Frontend shell online</p>
              </div>
              <Sparkles className="h-5 w-5 text-[#16a34a]" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <p className="text-3xl font-extrabold text-[#1f1b2d]">{stat.value}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
