"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Filter, Grid2X2, List, Search, Star } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { storiesApi, type StoryListItem } from "@/lib/api";

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    storiesApi()
      .list()
      .then(({ stories, total }) => {
        setStories(stories);
        setTotal(total);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load stories"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = stories.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.genre.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section>
      <PageHeader eyebrow="Story Library" title="My Stories" description={`${total} saved ${total === 1 ? "story" : "stories"}`}>
        <Button variant="outline" size="icon" aria-label="Grid view">
          <Grid2X2 className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="List view">
          <List className="h-4 w-4" aria-hidden="true" />
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search stories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Genre
        </Button>
        <Button variant="outline">
          <Star className="h-4 w-4" aria-hidden="true" />
          Favorites
        </Button>
      </div>

      {loading && (
        <div className="flex min-h-48 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading stories…</p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-[#fbfaf7] p-8 text-center">
          <p className="font-semibold text-[#292524]">
            {search ? "No stories match your search" : "No stories yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? "Try a different search term." : "Open Studio to write and save your first story."}
          </p>
          {!search && (
            <Link href="/studio" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}>
              Open Studio
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((story) => (
          <Card key={story.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  {story.genre && <Badge variant="primary">{story.genre}</Badge>}
                  <CardTitle className="mt-3">{story.title}</CardTitle>
                </div>
                <Star
                  className={`h-5 w-5 shrink-0 ${story.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
              </div>
              <CardDescription>
                {new Date(story.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                {story.mood ? ` · ${story.mood}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{story.word_count} words</span>
              <Link
                href={`/stories/${story.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
