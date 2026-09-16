"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Copy,
  Download,
  Filter,
  Grid2X2,
  List,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { storiesApi, type StoryListItem, type StoryOut } from "@/lib/api";

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Quick reading modal
  const [readingStory, setReadingStory] = useState<StoryOut | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadStories = () => {
    setLoading(true);
    storiesApi()
      .list()
      .then(({ stories, total }) => {
        setStories(stories);
        setTotal(total);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load stories"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStories();
  }, []);

  const handleOpenReader = async (id: string) => {
    setReadingLoading(true);
    try {
      const data = await storiesApi().get(id);
      setReadingStory(data);
    } catch {
      // ignore
    } finally {
      setReadingLoading(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, story: StoryListItem) => {
    e.stopPropagation();
    try {
      const updated = await storiesApi().update(story.id, {
        is_favorite: !story.is_favorite,
      });
      setStories((prev) =>
        prev.map((s) => (s.id === story.id ? { ...s, is_favorite: updated.is_favorite } : s)),
      );
      if (readingStory && readingStory.id === story.id) {
        setReadingStory((prev) => (prev ? { ...prev, is_favorite: updated.is_favorite } : null));
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteStory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    try {
      await storiesApi().delete(id);
      setStories((prev) => prev.filter((s) => s.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (readingStory?.id === id) setReadingStory(null);
      setConfirmDeleteId(null);
    } catch {
      // ignore
    }
  };

  const handleDownloadTxt = (story: StoryListItem | StoryOut, content?: string) => {
    const textContent = content || "";
    const blob = new Blob([`${story.title}\n\n${textContent}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanTitle =
      story.title.trim().toLowerCase().replace(/[^a-z0-9\u0980-\u09FF_-]+/gi, "_") || "story";
    a.download = `${cleanTitle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyStory = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filtered = stories.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.genre && s.genre.toLowerCase().includes(search.toLowerCase()));
    if (onlyFavorites) {
      return matchesSearch && s.is_favorite;
    }
    return matchesSearch;
  });

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Story Library"
        title="My Saved Stories (আমার সংরক্ষিত গল্প)"
        description={`${total} saved ${total === 1 ? "story" : "stories"}`}
      >
        <Link href="/chat" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <MessageSquare className="h-4 w-4 mr-1.5" />
          AI Story Chat
        </Link>
        <Link href="/train" className={buttonVariants({ size: "sm" })}>
          <Sparkles className="h-4 w-4 mr-1.5" />
          Train AI
        </Link>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 bg-white"
            placeholder="Search saved stories (শিরোনাম বা বিষয় দিয়ে খুঁজুন)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={onlyFavorites ? "primary" : "outline"}
            size="sm"
            onClick={() => setOnlyFavorites((prev) => !prev)}
            className="gap-1.5"
          >
            <Star
              className={`h-4 w-4 ${onlyFavorites ? "fill-white text-white" : "text-amber-500"}`}
            />
            {onlyFavorites ? "Showing Favorites" : "Favorites Only"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-48 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-[#fbfaf7] p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <p className="font-semibold text-[#292524] text-base">
            {search
              ? "কোনো সংরক্ষিত গল্প পাওয়া যায়নি"
              : onlyFavorites
                ? "কোনো প্রিয় (Favorite) গল্প নেই"
                : "এখনও কোনো গল্প সেভ করা হয়নি"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            {search
              ? "অন্য কোনো শিরোনাম বা শব্দ দিয়ে খুঁজে দেখুন।"
              : "AI Chat-এ গিয়ে গল্প তৈরি করুন এবং 'Save Story' বাটনে ক্লিক করে এখানে সেভ করে রাখুন।"}
          </p>
          {!search && (
            <div className="mt-5 flex gap-3">
              <Link href="/chat" className={buttonVariants({ size: "sm" })}>
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Open AI Chat
              </Link>
              <Link href="/studio" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Open Studio
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Stories Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((story) => {
          const isConfirming = confirmDeleteId === story.id;
          return (
            <Card
              key={story.id}
              className="flex flex-col justify-between transition-all hover:shadow-md border-border bg-white"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="primary" className="text-[11px]">
                        {story.genre || "Story"}
                      </Badge>
                      {story.mood && (
                        <Badge variant="neutral" className="text-[11px]">
                          {story.mood}
                        </Badge>
                      )}
                    </div>
                    <CardTitle
                      onClick={() => handleOpenReader(story.id)}
                      className="mt-2.5 text-base font-bold text-[#1f1b2d] leading-snug cursor-pointer hover:text-primary transition line-clamp-2"
                    >
                      {story.title}
                    </CardTitle>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, story)}
                    className="p-1 rounded-md hover:bg-neutral-100 transition"
                    title={story.is_favorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star
                      className={`h-5 w-5 shrink-0 ${
                        story.is_favorite
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/50 hover:text-amber-400"
                      }`}
                    />
                  </button>
                </div>

                <CardDescription className="text-xs text-muted-foreground mt-1.5">
                  {new Date(story.updated_at || story.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  <span> · {story.word_count.toLocaleString()} words</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 border-t border-border/60 mt-3 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Quick Read Modal Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold hover:bg-primary/5 hover:text-primary"
                    onClick={() => handleOpenReader(story.id)}
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1" />
                    Read
                  </Button>

                  {/* Full Story Page Link */}
                  <Link
                    href={`/stories/${story.id}`}
                    className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 text-xs" })}
                  >
                    Details
                  </Link>
                </div>

                {/* Card Action Icons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={isConfirming ? "destructive" : "ghost"}
                    size="sm"
                    className={`h-8 text-xs ${
                      isConfirming
                        ? ""
                        : "text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    }`}
                    onClick={(e) => handleDeleteStory(e, story.id)}
                    title="Delete saved story"
                  >
                    {isConfirming ? "Confirm?" : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                  {isConfirming && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(null);
                      }}
                    >
                      X
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Reading Modal */}
      {readingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <Badge variant="primary">{readingStory.genre || "Story"}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {readingStory.word_count.toLocaleString()} words
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-bold text-[#1f1b2d] truncate">
                  {readingStory.title}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopyStory(
                      readingStory.id,
                      `${readingStory.title}\n\n${readingStory.content}`,
                    )
                  }
                  className="h-8 text-xs"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  {copiedId === readingStory.id ? "Copied!" : "Copy"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadTxt(readingStory, readingStory.content)}
                  className="h-8 text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReadingStory(null)}
                  className="h-8 w-8 p-0"
                  aria-label="Close reader"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal Body: Manuscript */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="whitespace-pre-wrap font-serif text-base leading-relaxed text-[#292524]">
                {readingStory.content || "(No content available)"}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-border px-6 py-3 bg-[#fcfbf9] rounded-b-2xl text-xs">
              <span className="text-muted-foreground">
                Saved in TaleForge Library
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/stories/${readingStory.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Open Full Page
                </Link>
                <Button size="sm" onClick={() => setReadingStory(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
