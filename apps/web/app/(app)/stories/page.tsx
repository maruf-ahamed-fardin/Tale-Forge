"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Copy,
  Download,
  Filter,
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
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function StoriesPage() {
  const { t, language } = useLanguage();
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
        eyebrow={t("nav.stories", undefined, "Story Library")}
        title={t("stories.title", undefined, "Story Library")}
        description={
          language === "bn"
            ? `${total}টি সংরক্ষিত গল্প`
            : `${total} saved ${total === 1 ? "story" : "stories"}`
        }
      >
        <Link href="/chat" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full sm:w-auto justify-center rounded-xl" })}>
          <MessageSquare className="h-4 w-4 mr-1.5" />
          {t("nav.chat", undefined, "AI Story Chat")}
        </Link>
        <Link href="/train" className={buttonVariants({ size: "sm", className: "w-full sm:w-auto justify-center rounded-xl" })}>
          <Sparkles className="h-4 w-4 mr-1.5" />
          {t("nav.train", undefined, "Train AI")}
        </Link>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("stories.searchPlaceholder", undefined, "Search stories by title or snippet...")}
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
            {onlyFavorites
              ? t("stories.favoritesFilter", undefined, "Favorites")
              : t("stories.allFilter", undefined, "All Stories")}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-48 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <p className="font-semibold text-foreground text-base">
            {search
              ? t("stories.noStoriesFound", undefined, "No stories found in your library.")
              : t("stories.noStoriesFound", undefined, "No stories found in your library.")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            {t(
              "stories.startCrafting",
              undefined,
              "Start creating in the AI Chat or Story Studio!"
            )}
          </p>
          {!search && (
            <div className="mt-5 flex gap-3">
              <Link href="/chat" className={buttonVariants({ size: "sm" })}>
                <MessageSquare className="h-4 w-4 mr-1.5" />
                {t("nav.chat", undefined, "Open AI Chat")}
              </Link>
              <Link href="/studio" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t("nav.studio", undefined, "Open Studio")}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Stories Grid */}
      <div className="grid gap-3.5 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((story) => {
          const isConfirming = confirmDeleteId === story.id;
          return (
            <Card
              key={story.id}
              className="flex flex-col justify-between transition-all rounded-2xl sm:rounded-3xl border border-border/80 bg-surface/85 backdrop-blur-xl shadow-card-elevated hover:border-primary/40 hover:-translate-y-1 hover:shadow-radiant group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        {story.genre || "Story"}
                      </span>
                      {story.mood && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-surface-hover text-muted-foreground border border-border/60">
                          {story.mood}
                        </span>
                      )}
                    </div>
                    <CardTitle
                      onClick={() => handleOpenReader(story.id)}
                      className="mt-2.5 font-editorial text-lg font-bold text-foreground leading-snug cursor-pointer group-hover:text-primary transition line-clamp-2"
                    >
                      {story.title}
                    </CardTitle>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, story)}
                    className="p-1.5 rounded-xl hover:bg-surface-hover transition"
                    title={story.is_favorite ? t("stories.unfavorite", undefined, "Unfavorite") : t("stories.favorite", undefined, "Favorite")}
                  >
                    <Star
                      className={`h-4 w-4 shrink-0 transition-transform hover:scale-110 ${
                        story.is_favorite
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40 hover:text-amber-400"
                      }`}
                    />
                  </button>
                </div>

                <CardDescription className="text-xs text-muted-foreground mt-2">
                  {new Date(story.updated_at || story.created_at).toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  <span> · {story.word_count.toLocaleString()} {t("common.words", undefined, "words")}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 border-t border-border/60 mt-3 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-xl border-border/70 hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                    onClick={() => handleOpenReader(story.id)}
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1" />
                    {t("train.readStory", undefined, "Read")}
                  </Button>

                  <Link
                    href={`/stories/${story.id}`}
                    className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 text-xs rounded-xl" })}
                  >
                    Details
                  </Link>
                </div>

                {/* Card Action Icons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const full = await storiesApi().get(story.id);
                        handleDownloadTxt(full, full.content);
                      } catch {
                        handleDownloadTxt(story, "");
                      }
                    }}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground transition"
                    title={t("common.download", undefined, "Download TXT")}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteStory(e, story.id)}
                    className={cn(
                      "p-1.5 rounded-md transition",
                      isConfirming
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600",
                    )}
                    title={isConfirming ? t("common.confirm", undefined, "Click again to delete") : t("common.delete", undefined, "Delete story")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Reading Modal */}
      {readingStory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs"
          onClick={() => setReadingStory(null)}
        >
          <div
            className="flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-3 sm:py-4">
              <div className="min-w-0 pr-3">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {t("stories.readerModalTitle", undefined, "Story Reader")}
                </span>
                <h2 className="mt-0.5 text-base sm:text-lg font-bold text-foreground truncate">
                  {readingStory.title}
                </h2>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopyStory(
                      readingStory.id,
                      `${readingStory.title}\n\n${readingStory.content}`,
                    )
                  }
                  className="h-8 px-2 sm:px-3 text-xs"
                >
                  <Copy className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">
                    {copiedId === readingStory.id ? t("common.copied", undefined, "Copied!") : t("common.copy", undefined, "Copy")}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadTxt(readingStory, readingStory.content)}
                  className="h-8 px-2 sm:px-3 text-xs"
                >
                  <Download className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">{t("common.download", undefined, "Download")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReadingStory(null)}
                  className="h-8 w-8 p-0"
                  aria-label={t("common.close", undefined, "Close")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal Body: Manuscript */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 story-paper">
              <div className="whitespace-pre-wrap font-serif text-sm sm:text-base leading-relaxed text-foreground">
                {readingStory.content || "(No content available)"}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 sm:px-6 py-3 bg-surface-hover/50 rounded-b-2xl text-xs">
              <span className="text-muted-foreground text-xs">
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
                  {t("common.close", undefined, "Close")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
