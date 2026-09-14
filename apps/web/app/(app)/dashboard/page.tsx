"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Library, PenLine, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { storiesApi, type StoryListItem } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    storiesApi()
      .list(0, 3)
      .then(({ stories, total }) => {
        setStories(stories);
        setTotal(total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalWords = stories.reduce((sum, s) => sum + s.word_count, 0);
  const favoriteGenre = stories.length
    ? [...stories].sort(
        (a, b) =>
          stories.filter((s) => s.genre === b.genre).length -
          stories.filter((s) => s.genre === a.genre).length,
      )[0]?.genre || "None"
    : "None";

  const stats = [
    { label: "Stories created", value: String(total) },
    { label: "Words generated", value: totalWords > 0 ? totalWords.toLocaleString() : "0" },
    { label: "Favorite genre", value: favoriteGenre },
    { label: "Generation count", value: "0" },
  ];

  return (
    <section>
      <PageHeader
        title={`${greeting()}${user?.display_name ? `, ${user.display_name}` : ""}.`}
        description="Ready to create something new?"
      >
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
                <CardDescription>Your latest saved work.</CardDescription>
              </div>
              <Library className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-44 items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading…</p>
              </div>
            ) : stories.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-[#fbfaf7] p-6 text-center">
                <BookOpen className="h-8 w-8 text-primary" aria-hidden="true" />
                <p className="mt-3 font-semibold text-[#292524]">No stories yet</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  Start with a genre, theme, mood, setting, and a few characters.
                </p>
                <Link
                  href="/studio"
                  className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}
                >
                  Open Studio
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {stories.map((story) => (
                  <li key={story.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-3">
                    <div>
                      <p className="text-sm font-semibold text-[#292524]">{story.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {story.word_count} words{story.genre ? ` · ${story.genre}` : ""}
                      </p>
                    </div>
                    <Link
                      href={`/stories/${story.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
                {total > 3 && (
                  <li className="pt-1 text-center">
                    <Link href="/stories" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      View all {total} stories
                    </Link>
                  </li>
                )}
              </ul>
            )}
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
