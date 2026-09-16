"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { simpleAiApi, type AIStatus, type TrainedStoryItem } from "@/lib/api";

export default function SimpleTrainPage() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [training, setTraining] = useState(false);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Visibility toggle for trained stories list
  const [showTrainedStories, setShowTrainedStories] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadStatus = () => {
    simpleAiApi()
      .status()
      .then((data) => setStatus(data))
      .catch(() => {});
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || training) return;

    setTraining(true);
    setMsg(null);

    try {
      const res = await simpleAiApi().trainText(text, title.trim() || "My Story");
      setMsg({ type: "success", text: res.message });
      setTitle("");
      setText("");
      loadStatus();
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Training failed. Please try again.",
      });
    } finally {
      setTraining(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTraining(true);
    setMsg(null);

    try {
      const res = await simpleAiApi().trainFile(file, title);
      setMsg({ type: "success", text: res.message });
      loadStatus();
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "File upload training failed.",
      });
    } finally {
      setTraining(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    setDeletingId(id);
    try {
      await simpleAiApi().deleteTrainedStory(id);
      setMsg({
        type: "success",
        text: "গল্পটি সফলভাবে AI মডেলের মেমোরি থেকে মুছে ফেলা হয়েছে।",
      });
      setConfirmDeleteId(null);
      if (expandedStoryId === id) setExpandedStoryId(null);
      loadStatus();
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "গল্প মুছতে ব্যর্থ হয়েছে।",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (id: string, storyText: string) => {
    navigator.clipboard.writeText(storyText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownload = (story: TrainedStoryItem) => {
    const content = `${story.title}\n\n${story.text || ""}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanTitle =
      story.title.trim().toLowerCase().replace(/[^a-z0-9\u0980-\u09FF_-]+/gi, "_") || "trained_story";
    a.download = `${cleanTitle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const storiesList: TrainedStoryItem[] =
    status?.trained_stories && status.trained_stories.length > 0
      ? status.trained_stories
      : status?.recent_stories || [];

  const filteredStories = storiesList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      (s.text && s.text.toLowerCase().includes(q))
    );
  });

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1f1b2d] flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Train AI with Your Stories (AI মডেল ট্রেইন করুন)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            এখানে আপনার গল্প দিন। AI সেগুলোর স্টাইল, চরিত্র ও ভাষা শিখে নতুন গল্প তৈরি করবে।
          </p>
        </div>

        <Link href="/chat" className={buttonVariants()}>
          <MessageSquare className="h-4 w-4 mr-1.5" />
          Go to AI Chat
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-primary/30 bg-indigo-50/30">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-primary p-3 text-white">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1f1b2d]">
                {status ? status.total_trained_stories : 0}
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Trained Stories in AI Memory (ট্রেইন করা মোট গল্প)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1f1b2d]">
                {status ? status.total_words.toLocaleString() : 0}
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Total Words Learned by AI (মোট শেখা শব্দ)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Story Data to Model</CardTitle>
          <CardDescription>
            নিচের বক্সে আপনার গল্প পেস্ট করুন অথবা সরাসরি <strong>.txt</strong> বা <strong>.pdf</strong> ফাইল (বই, পাণ্ডুলিপি বা ছোটগল্প) আপলোড করুন।
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTrain} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Story Title (গল্পের নাম)
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: একাকী দুপুর / A Quiet Rain (ফাইল আপলোড করলে নাম স্বয়ংক্রিয়ভাবে নেবে)"
                className="mt-1.5"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Story Content (গল্পের লেখা পেস্ট করুন)
                </label>
                <div className="text-xs text-muted-foreground">
                  {text.trim() ? `${text.trim().split(/\s+/).length} words` : "0 words"}
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="এখানে আপনার সম্পূর্ণ গল্প বা লেখার প্যারাগ্রাফ পেস্ট করুন..."
                className="mt-1.5 min-h-[180px] w-full rounded-lg border border-border p-4 text-sm font-serif leading-relaxed text-[#292524] outline-none focus:border-primary"
                required
              />
            </div>

            {msg && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                  msg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {msg.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>{msg.text}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <div className="flex flex-col gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={training}
                  className="border-primary/40 hover:bg-primary/5"
                >
                  <Upload className="h-4 w-4 mr-1.5 text-primary" />
                  Upload .txt / .pdf File (বই বা ফাইল)
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  সাপোর্ট: .pdf (বই/ডকুমেন্ট) এবং .txt ফাইল
                </span>
              </div>

              <Button type="submit" disabled={training || !text.trim()}>
                {training ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                    AI Training in Progress…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1.5" />
                    Train AI Now (মডেল ট্রেইন করুন)
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Trained Stories Section with Show/Hide Toggle & Full Inspection */}
      <Card className="border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Stories Used for Training (মডেল যে যে গল্প দিয়ে ট্রেইন হয়েছে)
            </CardTitle>
            <CardDescription className="mt-0.5">
              {storiesList.length > 0
                ? `মোট ${storiesList.length} টি গল্প দিয়ে আপনার AI মডেল ট্রেইন করা রয়েছে। আপনি চাইলে সম্পূর্ণ গল্প দেখতে বা লুকিয়ে রাখতে পারেন।`
                : "এখনও কোনো গল্প ট্রেইন করা হয়নি। উপরের ফর্মে গল্প দিন।"}
            </CardDescription>
          </div>

          {storiesList.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Hide / Show Toggle Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTrainedStories((prev) => !prev)}
                className="border-border hover:bg-muted font-medium text-xs flex items-center gap-1.5"
                title={showTrainedStories ? "গল্পের তালিকা লুকিয়ে রাখুন" : "গল্পের তালিকা দেখুন"}
              >
                {showTrainedStories ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Hide Stories (লুকান)</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span>Show Stories ({storiesList.length} টি গল্প দেখুন)</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </CardHeader>

        {showTrainedStories && storiesList.length > 0 && (
          <CardContent className="space-y-4 pt-1">
            {/* Search Input if multiple stories */}
            {storiesList.length > 2 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 text-xs"
                  placeholder="ট্রেইন করা গল্প খুঁজুন (শিরোনাম বা লেখার অংশ দিয়ে)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}

            {filteredStories.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                কোনো গল্প পাওয়া যায়নি &quot;{searchQuery}&quot; দিয়ে।
              </p>
            ) : (
              <div className="divide-y divide-border border rounded-lg overflow-hidden bg-white">
                {filteredStories.map((story) => {
                  const isExpanded = expandedStoryId === story.id;
                  const isConfirming = confirmDeleteId === story.id;
                  const isDeleting = deletingId === story.id;

                  const trainedDate = story.trained_at
                    ? new Date(story.trained_at).toLocaleDateString("bn-BD", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "";

                  return (
                    <div key={story.id} className="p-3.5 transition-colors hover:bg-neutral-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        {/* Title & Info */}
                        <div
                          className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0"
                          onClick={() =>
                            setExpandedStoryId(isExpanded ? null : story.id)
                          }
                        >
                          <div className="rounded-md bg-primary/10 p-1.5 text-primary mt-0.5 shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-[#292524] truncate">
                                {story.title}
                              </span>
                              {story.language === "bn" ? (
                                <Badge variant="primary" className="text-[10px] px-1.5 py-0">
                                  বাংলা
                                </Badge>
                              ) : (
                                <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                                  English
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>{story.word_count.toLocaleString()} words</span>
                              {trainedDate && (
                                <>
                                  <span>•</span>
                                  <span>{trainedDate}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {/* Toggle Expand Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setExpandedStoryId(isExpanded ? null : story.id)
                            }
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                Hide Text
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                Read Story
                              </>
                            )}
                          </Button>

                          {/* Download */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDownload(story)}
                            title="Download story as .txt file"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant={isConfirming ? "destructive" : "ghost"}
                            size="sm"
                            className={`h-8 text-xs ${
                              isConfirming
                                ? ""
                                : "text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            }`}
                            disabled={isDeleting}
                            onClick={() => handleDeleteStory(story.id)}
                            title="Remove this story from AI memory"
                          >
                            {isDeleting ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : isConfirming ? (
                              "Confirm?"
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          {isConfirming && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-muted-foreground"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Full Story Content */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-dashed border-border/80 space-y-2 animate-fade-in">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-semibold text-[#1f1b2d]">
                              সম্পূর্ণ গল্প / Full Story Text:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopy(story.id, story.text || "")}
                                className="inline-flex items-center gap-1 hover:text-primary font-medium transition"
                              >
                                <Copy className="h-3 w-3" />
                                {copiedId === story.id ? "Copied!" : "Copy Text"}
                              </button>
                            </div>
                          </div>

                          <div className="max-h-72 overflow-y-auto rounded-lg bg-[#faf8f5] p-3.5 border border-border/60 text-xs font-serif leading-relaxed text-[#292524] whitespace-pre-wrap">
                            {story.text || "(No text preview available)"}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}

        {!showTrainedStories && storiesList.length > 0 && (
          <CardContent className="py-3 text-center text-xs text-muted-foreground bg-neutral-50/50">
            গল্পের তালিকাটি লুকানো রয়েছে। দেখতে উপরে &quot;Show Stories&quot; এ ক্লিক করুন।
          </CardContent>
        )}
      </Card>
    </section>
  );
}
