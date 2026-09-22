"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  Download,
  FileText,
  Heart,
  PenLine,
  Quote,
  RefreshCw,
  Trash2,
  Wand2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { QuoteCardDialog } from "@/components/story/quote-card-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { storiesApi, type StoryOut } from "@/lib/api";
import { exportStoryAsPdf } from "@/lib/pdf-export";
import { useLanguage } from "@/lib/i18n";

export default function StoryDetailPage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const storyId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [story, setStory] = useState<StoryOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);

  useEffect(() => {
    if (!storyId) return;
    setLoading(true);
    storiesApi()
      .get(storyId)
      .then((data) => setStory(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("storyDetail.storyNotFound", undefined, "Story not found"));
      })
      .finally(() => setLoading(false));
  }, [storyId, t]);

  const toggleFavorite = async () => {
    if (!story) return;
    try {
      const updated = await storiesApi().update(story.id, {
        is_favorite: !story.is_favorite,
      });
      setStory(updated);
    } catch {
      // optimistic rollback or error
    }
  };

  const handleCopy = () => {
    if (!story) return;
    navigator.clipboard.writeText(`${story.title}\n\n${story.content}`).then(() => {
      setCopyMsg(t("storyDetail.copiedToClipboard", undefined, "Copied to clipboard!"));
      setTimeout(() => setCopyMsg(""), 3000);
    });
  };

  const handleExport = () => {
    if (!story) return;
    const blob = new Blob([`${story.title}\n\n${story.content}`], {
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

  const handleDelete = async () => {
    if (!story) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await storiesApi().delete(story.id);
      router.push("/stories");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete story");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <section className="space-y-4">
        <Link
          href="/stories"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("storyDetail.backToLibrary", undefined, "Back to Stories")}
        </Link>
        <Card className="bg-surface border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-red-500/70" />
            <h3 className="mt-4 text-base font-semibold text-foreground">
              {error || t("storyDetail.storyNotFound", undefined, "Story not found")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("storyDetail.storyNotFoundDesc", undefined, "This story may have been deleted or moved.")}
            </p>
            <Link href="/stories" className={`${buttonVariants({ variant: "outline" })} mt-4`}>
              {t("storyDetail.returnToLibrary", undefined, "Return to Library")}
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  const formattedDate = new Date(story.created_at).toLocaleDateString(
    language === "bn" ? "bn-BD" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <section>
      <div className="mb-3">
        <Link
          href="/stories"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("storyDetail.backToLibrary", undefined, "Back to Library")}
        </Link>
      </div>

      <PageHeader
        eyebrow={t("storyDetail.eyebrow", undefined, "Story Detail")}
        title={story.title || "Untitled Story"}
        description={`${story.genre || "Uncategorized"} · ${story.word_count.toLocaleString(language === "bn" ? "bn-BD" : "en-US")} ${t("common.words", undefined, "words")} · ${t("storyDetail.created", undefined, "Created on")} ${formattedDate}`}
      >
        <Link
          href={`/studio?id=${story.id}`}
          className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto justify-center rounded-xl border-border/80" })}
        >
          <PenLine className="h-4 w-4 mr-1.5" aria-hidden="true" />
          {t("storyDetail.editInStudio", undefined, "Edit in Studio")}
        </Link>
        <Link
          href={`/studio?id=${story.id}&action=continue`}
          className={buttonVariants({ className: "w-full sm:w-auto justify-center rounded-xl bg-gradient-radiant text-white shadow-radiant" })}
        >
          <Wand2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
          {t("storyDetail.continueStory", undefined, "Continue Story")}
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_320px]">
        {/* Story Text Area */}
        <Card className="min-w-0 bg-surface border-border">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3">
            <CardTitle className="text-base sm:text-lg text-foreground">{t("storyDetail.manuscript", undefined, "Manuscript")}</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {copyMsg && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-fade-in">
                  {copyMsg}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                aria-label="Copy story text"
                className="h-8 text-xs rounded-xl"
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                {t("storyDetail.copy", undefined, "Copy")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportStoryAsPdf({
                    title: story.title,
                    content: story.content,
                    genre: story.genre,
                    wordCount: story.word_count,
                    date: formattedDate,
                  })
                }
                aria-label="Export story as PDF"
                className="h-8 text-xs rounded-xl border-border/80"
              >
                <FileText className="h-3.5 w-3.5 mr-1 text-primary" />
                <span>{language === "bn" ? "পিডিএফ (PDF)" : "Export PDF"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQuoteDialog(true)}
                aria-label="Create quote card"
                className="h-8 text-xs rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
              >
                <Quote className="h-3.5 w-3.5 mr-1" />
                <span>{language === "bn" ? "উদ্ধৃতি কার্ড" : "Quote Card"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                aria-label="Export story"
                className="h-8 text-xs rounded-xl border-border/80"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                <span>TXT</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 lg:p-6">
            <div className="story-paper min-h-[420px] sm:min-h-[560px] rounded-2xl border border-border/70 p-4 sm:p-8 lg:p-10 shadow-xs">
              {story.content ? (
                <div className="whitespace-pre-wrap font-serif text-[15px] sm:text-base leading-relaxed sm:leading-8 text-foreground">
                  {story.content}
                </div>
              ) : (
                <p className="italic text-muted-foreground text-sm">
                  {t(
                    "storyDetail.noContentYet",
                    undefined,
                    "This story does not have any written content yet. Click 'Edit in Studio' to begin writing or generating."
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Story Metadata & Actions Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-base text-foreground">{t("storyDetail.details", undefined, "Story Details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("storyDetail.creativeDirection", undefined, "Creative Direction")}
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {story.genre && <Badge variant="primary">{story.genre}</Badge>}
                  {story.mood && <Badge variant="warm">{story.mood}</Badge>}
                  {story.length_preset && <Badge variant="neutral">{story.length_preset}</Badge>}
                </div>
              </div>

              {story.setting && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("storyDetail.settingPremise", undefined, "Setting / Premise")}
                  </label>
                  <p className="mt-1 text-sm text-foreground/90 rounded-md bg-surface-hover/50 p-3 border border-border">
                    {story.setting}
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {t("storyDetail.wordCount", undefined, "Word Count")}
                  </span>
                  <span className="font-semibold text-foreground">
                    {story.word_count.toLocaleString(language === "bn" ? "bn-BD" : "en-US")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {t("storyDetail.created", undefined, "Created")}
                  </span>
                  <span>{formattedDate}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <Button
                  variant={story.is_favorite ? "primary" : "outline"}
                  className="w-full justify-center"
                  onClick={toggleFavorite}
                >
                  <Heart
                    className={`h-4 w-4 mr-2 ${
                      story.is_favorite ? "fill-white text-white" : ""
                    }`}
                  />
                  {story.is_favorite
                    ? t("storyDetail.favorited", undefined, "Favorited")
                    : t("storyDetail.addToFavorites", undefined, "Add to Favorites")}
                </Button>

                <Button
                  variant={confirmDelete ? "destructive" : "ghost"}
                  className={`w-full justify-center ${confirmDelete ? "" : "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700"}`}
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {confirmDelete
                    ? t("storyDetail.confirmDelete", undefined, "Confirm Delete?")
                    : t("storyDetail.deleteStory", undefined, "Delete Story")}
                </Button>
                {confirmDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => setConfirmDelete(false)}
                  >
                    {t("common.cancel", undefined, "Cancel")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Social Quote Card Generator Dialog */}
      <QuoteCardDialog
        open={showQuoteDialog}
        onClose={() => setShowQuoteDialog(false)}
        storyTitle={story.title}
        defaultQuote={story.content}
      />
    </section>
  );
}
