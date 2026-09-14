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
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { storiesApi, type StoryOut } from "@/lib/api";

export default function StoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [story, setStory] = useState<StoryOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!storyId) return;
    setLoading(true);
    storiesApi()
      .get(storyId)
      .then((data) => setStory(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Story not found");
      })
      .finally(() => setLoading(false));
  }, [storyId]);

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
      setCopyMsg("Copied to clipboard!");
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
    const cleanTitle = story.title.trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, "_") || "story";
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
          Back to Stories
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-red-500/70" />
            <h3 className="mt-4 text-base font-semibold text-[#292524]">
              {error || "Story not found"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This story may have been deleted or moved.
            </p>
            <Link href="/stories" className={`${buttonVariants({ variant: "outline" })} mt-4`}>
              Return to Library
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  const formattedDate = new Date(story.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section>
      <div className="mb-3">
        <Link
          href="/stories"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>
      </div>

      <PageHeader
        eyebrow="Story Detail"
        title={story.title || "Untitled Story"}
        description={`${story.genre || "Uncategorized"} · ${story.word_count.toLocaleString()} words · Created on ${formattedDate}`}
      >
        <Link
          href={`/studio?id=${story.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          <PenLine className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Edit in Studio
        </Link>
        <Link
          href={`/studio?id=${story.id}&action=continue`}
          className={buttonVariants()}
        >
          <Wand2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Continue Story
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Story Text Area */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Manuscript</CardTitle>
            <div className="flex items-center gap-2">
              {copyMsg && (
                <span className="text-xs font-medium text-green-600 animate-fade-in">
                  {copyMsg}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                aria-label="Copy story text"
              >
                <Copy className="h-4 w-4 mr-1.5" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                aria-label="Export story"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export TXT
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="story-paper min-h-[560px] rounded-xl border border-border p-6 sm:p-10">
              {story.content ? (
                <div className="whitespace-pre-wrap font-serif text-base leading-8 text-[#292524]">
                  {story.content}
                </div>
              ) : (
                <p className="italic text-muted-foreground">
                  This story does not have any written content yet. Click &quot;Edit in Studio&quot; to begin writing or generating.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Story Metadata & Actions Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Story Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Creative Direction
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
                    Setting / Premise
                  </label>
                  <p className="mt-1 text-sm text-[#44403c] rounded-md bg-[#faf8f5] p-3 border border-border">
                    {story.setting}
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Word Count
                  </span>
                  <span className="font-semibold text-[#292524]">{story.word_count.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Created
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
                  {story.is_favorite ? "Favorited" : "Add to Favorites"}
                </Button>

                <Button
                  variant={confirmDelete ? "destructive" : "ghost"}
                  className={`w-full justify-center ${confirmDelete ? "" : "text-red-600 hover:bg-red-50 hover:text-red-700"}`}
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {confirmDelete ? "Confirm Delete?" : "Delete Story"}
                </Button>
                {confirmDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
