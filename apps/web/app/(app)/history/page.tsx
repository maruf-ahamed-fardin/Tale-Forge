"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  History,
  PenLine,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { storiesApi, type StoryListItem } from "@/lib/api";

export default function HistoryPage() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copyMsg, setCopyMsg] = useState("");

  const loadHistory = () => {
    setLoading(true);
    storiesApi()
      .list(0, 100)
      .then((data) => setStories(data.stories))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleCopy = (title: string, id: string) => {
    storiesApi()
      .get(id)
      .then((story) => {
        navigator.clipboard.writeText(`${story.title}\n\n${story.content}`);
        setCopyMsg(`Copied "${title}" to clipboard!`);
        setTimeout(() => setCopyMsg(""), 3000);
      });
  };

  const filtered = stories.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.genre.toLowerCase().includes(search.toLowerCase()) ||
      s.mood.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section>
      <PageHeader
        eyebrow="History"
        title="Generation & Story History"
        description="Comprehensive timeline of your generated drafts, revisions, and creative outputs."
      >
        <Button variant="outline" onClick={loadHistory} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      {copyMsg && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 animate-fade-in">
          {copyMsg}
        </div>
      )}

      {/* Filter and Search */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search history by title, genre, or mood…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-4 text-base font-semibold text-[#292524]">
              {search ? "No matching records found" : "No generation history yet"}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {search
                ? `No stories matched "${search}".`
                : "Create or generate your first story in the Story Studio to start recording history."}
            </p>
            <Link href="/studio" className={`${buttonVariants()} mt-4`}>
              Open Story Studio
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const date = new Date(item.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <Card key={item.id} className="transition hover:border-primary/40">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/stories/${item.id}`}
                        className="text-base font-semibold text-[#292524] hover:text-primary transition-colors"
                      >
                        {item.title || "Untitled Story"}
                      </Link>
                      {item.genre && <Badge variant="primary">{item.genre}</Badge>}
                      {item.mood && <Badge variant="warm">{item.mood}</Badge>}
                      {item.is_favorite && <Badge variant="neutral">Favorite</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {item.word_count.toLocaleString()} words
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {date}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(item.title, item.id)}
                      aria-label="Copy story text"
                    >
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copy
                    </Button>
                    <Link
                      href={`/studio?id=${item.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <PenLine className="h-3.5 w-3.5 mr-1.5" />
                      Edit in Studio
                    </Link>
                    <Link
                      href={`/stories/${item.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      View
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
