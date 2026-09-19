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
  FileText,
  GraduationCap,
  Info,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  User,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAccountId, simpleAiApi, type AIStatus, type TrainedStoryItem } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function SimpleTrainPage() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"personal" | "default">("personal");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [training, setTraining] = useState(false);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search and view states
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Reading modal
  const [modalStory, setModalStory] = useState<TrainedStoryItem | null>(null);

  // User account state
  const [currentUser, setCurrentUser] = useState<{ id?: string; email?: string; display_name?: string } | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState("default_local_author");

  const loadStatus = () => {
    const accId = getAccountId();
    setCurrentAccountId(accId);
    simpleAiApi()
      .status(accId)
      .then((data) => setStatus(data))
      .catch(() => {});
  };

  useEffect(() => {
    loadStatus();
    const u = getStoredUser();
    if (u) setCurrentUser(u);
  }, []);

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || training) return;

    setTraining(true);
    setMsg(null);

    try {
      const res = await simpleAiApi().trainText(text, title.trim() || "My Story", currentAccountId);
      setMsg({ type: "success", text: res.message });
      setTitle("");
      setText("");
      loadStatus();
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : t("common.error", undefined, "Training failed. Please try again."),
      });
    } finally {
      setTraining(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setMsg({
        type: "error",
        text: language === "bn" ? "ফাইলের আকার ২০ মেগাবাইট (20MB) এর কম হতে হবে।" : "File size must be under 20MB.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setTraining(true);
    setMsg(null);

    try {
      const res = await simpleAiApi().trainFile(file, title, currentAccountId);
      setMsg({ type: "success", text: res.message });
      loadStatus();
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : t("common.error", undefined, "File upload training failed."),
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
      await simpleAiApi().deleteTrainedStory(id, currentAccountId);
      setMsg({
        type: "success",
        text: t("train.trainingSuccess", undefined, "Story deleted from training memory."),
      });
      setConfirmDeleteId(null);
      if (expandedStoryId === id) setExpandedStoryId(null);
      loadStatus();
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : t("common.error", undefined, "Failed to delete story."),
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (id: string, storyText?: string) => {
    if (!storyText) return;
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

  const personalStories: TrainedStoryItem[] = status?.personal_stories || [];
  const defaultStories: TrainedStoryItem[] = status?.default_stories || [];

  const displayedList = activeTab === "personal" ? personalStories : defaultStories;

  const filteredStories = displayedList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      (s.text && s.text.toLowerCase().includes(q)) ||
      (s.genre && s.genre.toLowerCase().includes(q))
    );
  });

  const accountDisplay =
    currentUser?.display_name ||
    currentUser?.email ||
    (currentAccountId !== "default_local_author" ? `Account: ${currentAccountId}` : "Local Author");

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              {t("train.title", undefined, "Train AI on Your Stories")}
            </h1>
            <Badge variant="primary" className="text-xs px-2.5 py-0.5">
              <User className="h-3 w-3 mr-1" />
              {accountDisplay}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "train.subtitle",
              undefined,
              "Upload your personal literature, essays, and stories to fine-tune the AI's vocabulary, dialogue style, and narrative cadence."
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/chat" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-radiant px-4 py-2 text-xs font-bold text-white shadow-radiant hover:brightness-110 active:scale-95 transition-all">
            <MessageSquare className="h-4 w-4" />
            {t("nav.chat", undefined, "Go to Story Chat")}
          </Link>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Personal Account Training Stats */}
        <Card
          className={cn(
            "cursor-pointer transition-all rounded-3xl backdrop-blur-xl shadow-card-elevated",
            activeTab === "personal"
              ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-radiant"
              : "border-border/80 bg-surface/85 hover:border-primary/40 hover:-translate-y-0.5"
          )}
          onClick={() => setActiveTab("personal")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-gradient-radiant p-3.5 text-white shrink-0 shadow-radiant">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t("train.tabPersonal", undefined, "Personal Stories")}
                </span>
                <span className="text-[11px] bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-bold border border-primary/20">
                  {accountDisplay}
                </span>
              </div>
              <div className="text-2xl font-black text-foreground mt-1 font-display">
                {personalStories.length} <span className="text-sm font-normal text-muted-foreground">{t("nav.stories", undefined, "Stories")}</span>
                <span className="text-muted-foreground mx-1.5 font-light">|</span>
                <span className="text-xl font-bold text-foreground">
                  {(status?.personal_words || 0).toLocaleString()}
                </span>{" "}
                <span className="text-xs font-normal text-muted-foreground">{t("common.words", undefined, "words")}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
                {language === "bn" ? "আপনার নিজস্ব আপলোড করা গল্প ও লেখার স্টাইল" : "Your personal voice and trained vocabulary"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Default Master Literature Stats */}
        <Card
          className={cn(
            "cursor-pointer transition-all rounded-3xl backdrop-blur-xl shadow-card-elevated",
            activeTab === "default"
              ? "border-amber-500 bg-amber-50/25 dark:bg-amber-950/25 ring-2 ring-amber-500/30"
              : "border-border/80 bg-surface/85 hover:border-amber-500/40 hover:-translate-y-0.5"
          )}
          onClick={() => setActiveTab("default")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-3.5 text-white shrink-0 shadow-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {t("train.tabDefault", undefined, "Default Curated Library")}
                </span>
                <span className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                  Core AI
                </span>
              </div>
              <div className="text-2xl font-black text-foreground mt-0.5">
                {defaultStories.length} <span className="text-sm font-normal text-muted-foreground">{t("nav.stories", undefined, "Stories")}</span>
                <span className="text-muted-foreground mx-1.5 font-light">|</span>
                <span className="text-lg font-bold text-foreground">
                  {(status?.default_words || 0).toLocaleString()}
                </span>{" "}
                <span className="text-xs font-normal text-muted-foreground">{t("common.words", undefined, "words")}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
                {language === "bn" ? "হুমায়ূন, সত্যজিৎ ও রবীন্দ্র ধারার ক্লাসিক সাহিত্যিক গল্প" : "Classic literary benchmark stories"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1 bg-surface-hover/80 rounded-xl border border-border">
        <button
          onClick={() => setActiveTab("personal")}
          className={cn(
            "flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2",
            activeTab === "personal"
              ? "bg-surface text-primary shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-4 w-4 shrink-0" />
          <span>{t("train.tabPersonal", undefined, "Personal Stories")}</span>
          {personalStories.length > 0 && (
            <span className="bg-primary/10 text-primary text-[11px] px-1.5 py-0.2 rounded-full font-medium">
              {personalStories.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("default")}
          className={cn(
            "flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2",
            activeTab === "default"
              ? "bg-surface text-amber-600 dark:text-amber-400 shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>{t("train.tabDefault", undefined, "Default Curated Library")}</span>
          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] px-1.5 py-0.2 rounded-full font-medium">
            {defaultStories.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PERSONAL AI TRAINING */}
      {activeTab === "personal" && (
        <div className="space-y-6">
          {/* Account Isolation Notice */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-foreground/90 leading-relaxed">
              <strong className="font-semibold text-primary block text-sm mb-0.5">
                {language === "bn"
                  ? "শুধুমাত্র আপনার এই অ্যাকাউন্টের জন্য ব্যক্তিগত প্রশিক্ষণ"
                  : "Private Training for Your Account"}
              </strong>
              {language === "bn"
                ? `এখানে আপনি যে লেখা বা ফাইল দেবেন, তা সম্পূর্ণ সুরক্ষিতভাবে কেবল আপনার এই অ্যাকাউন্টে (${accountDisplay}) AI মডেলকে শেখাবে।`
                : `Stories and files uploaded here are isolated to your workspace account (${accountDisplay}) and will not be exposed to other users.`}
            </div>
          </div>

          {/* Training Input Form */}
          <Card className="border-border bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {t("train.manualTitle", undefined, "Manual Story Entry & File Upload")}
              </CardTitle>
              <CardDescription>
                {t(
                  "train.manualSubtitle",
                  undefined,
                  "Paste a story directly or upload .docx, .pdf, or .txt documents to train the model."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTrain} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    {t("train.storyTitleLabel", undefined, "Story Title")}
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t(
                      "train.storyTitlePlaceholder",
                      undefined,
                      "e.g., A Forgotten Afternoon in Rajshahi"
                    )}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      {t("train.storyContentLabel", undefined, "Story Content")}
                    </label>
                    <div className="text-xs text-muted-foreground">
                      {text.trim()
                        ? `${text.trim().split(/\s+/).length} ${t("common.words", undefined, "words")}`
                        : `0 ${t("common.words", undefined, "words")}`}
                    </div>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t(
                      "train.storyContentPlaceholder",
                      undefined,
                      "Paste your story text here in Bangla or English..."
                    )}
                    className="mt-1.5 min-h-[160px] w-full rounded-lg border border-border bg-surface p-4 text-sm font-serif leading-relaxed text-foreground outline-none focus:border-primary"
                    required
                  />
                </div>

                {msg && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-lg p-3 text-sm border",
                      msg.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900"
                    )}
                  >
                    {msg.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    )}
                    <span>{msg.text}</span>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border">
                  <div className="flex flex-col gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf,.docx,.doc"
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
                      {t("train.uploadTitle", undefined, "Upload Document (.txt, .pdf, .docx)")}
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      {t("train.supportedFormats", undefined, "Supports TXT, PDF, DOCX (up to 25MB)")}
                    </span>
                  </div>

                  <Button type="submit" disabled={training || !text.trim()}>
                    {training ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                        {t("train.trainingProgress", undefined, "Training in progress...")}
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-1.5" />
                        {t("train.trainButton", undefined, "Train AI on this Story")}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Personal Trained Stories List */}
          <Card className="border-border bg-surface">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {t("train.trainedStoriesList", undefined, "Your Trained Stories")}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {personalStories.length > 0
                    ? `${personalStories.length} ${t("nav.stories", undefined, "stories saved")}`
                    : t("train.noPersonalStories", undefined, "No personal stories trained yet.")}
                </CardDescription>
              </div>

              {personalStories.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {(status?.personal_words || 0).toLocaleString()} {t("common.words", undefined, "words learned")}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              {personalStories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center bg-surface-hover/50">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <User className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("train.noPersonalStories", undefined, "No personal stories yet")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {t(
                      "train.manualSubtitle",
                      undefined,
                      "Paste a story above or upload a document to train the AI with your personal style."
                    )}
                  </p>
                </div>
              ) : (
                <>
                  {personalStories.length > 2 && (
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-8 h-9 text-xs"
                        placeholder={t("stories.searchPlaceholder", undefined, "Search trained stories...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-surface">
                    {filteredStories.map((story) => {
                      const isExpanded = expandedStoryId === story.id;
                      const isConfirming = confirmDeleteId === story.id;
                      const isDeleting = deletingId === story.id;

                      const trainedDate = story.trained_at
                        ? new Date(story.trained_at).toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "";

                      return (
                        <div key={story.id} className="p-3.5 transition-colors hover:bg-surface-hover/50">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            {/* Title & Info */}
                            <div
                              className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0"
                              onClick={() => setExpandedStoryId(isExpanded ? null : story.id)}
                            >
                              <div className="rounded-md bg-primary/10 p-1.5 text-primary mt-0.5 shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-foreground truncate">
                                    {story.title}
                                  </span>
                                  <Badge variant="primary" className="text-[10px] px-1.5 py-0">
                                    {t("train.tabPersonal", undefined, "Personal")}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span>{story.word_count.toLocaleString()} {t("common.words", undefined, "words")}</span>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
                                onClick={() => setExpandedStoryId(isExpanded ? null : story.id)}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                    {t("common.close", undefined, "Hide")}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                    {t("train.readStory", undefined, "Read")}
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={() => handleCopy(story.id, story.text)}
                                title={t("common.copy", undefined, "Copy")}
                              >
                                {copiedId === story.id ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={() => handleDownload(story)}
                                title={t("common.download", undefined, "Download")}
                              >
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-8 text-xs font-medium transition-colors",
                                  isConfirming
                                    ? "bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-900 hover:bg-red-100"
                                    : "text-muted-foreground hover:text-red-600"
                                )}
                                onClick={() => handleDeleteStory(story.id)}
                                disabled={isDeleting}
                                title={t("common.delete", undefined, "Delete")}
                              >
                                {isDeleting ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-red-600" />
                                ) : isConfirming ? (
                                  <span className="text-[11px] font-bold">{t("common.confirm", undefined, "Confirm?")}</span>
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Text Preview */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <div className="max-h-60 overflow-y-auto rounded bg-surface-hover/60 p-3.5 text-xs font-serif leading-relaxed text-foreground whitespace-pre-wrap select-text">
                                {story.text || "(No content)"}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: DEFAULT AI MASTER STORIES */}
      {activeTab === "default" && (
        <div className="space-y-6">
          {/* Default Collection Banner */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/20 p-4 flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-foreground/90 leading-relaxed">
              <strong className="font-semibold text-amber-700 dark:text-amber-300 block text-sm mb-0.5">
                {t("train.defaultStoriesList", undefined, "Pre-trained Classic Bengali Stories")}
              </strong>
              {language === "bn"
                ? "আমাদের AI মডেল ইতিমধ্যে নিচে দেওয়া সাহিত্যধর্মী মাস্টারপিস গল্প দিয়ে উচ্চপর্যায়ে প্রশিক্ষিত। এটি ব্যাকরণ, সাহিত্যরস, উপমা ও ডায়ালগের জন্য মূল ভিত্তি।"
                : "The core AI engine comes pre-trained with these classic literary masterpieces, setting the foundation for storytelling style, prose cadence, and vocabulary."}
            </div>
          </div>

          {/* Search default stories */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-xs"
              placeholder={t("stories.searchPlaceholder", undefined, "Search default stories...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Stories Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredStories.map((story) => {
              return (
                <Card key={story.id} className="border-border hover:border-amber-500/40 transition-all bg-surface flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {story.genre && (
                          <Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-[10px] px-2 py-0 font-medium">
                            {story.genre}
                          </Badge>
                        )}
                        <Badge variant="neutral" className="text-[10px] text-muted-foreground">
                          <Lock className="h-2.5 w-2.5 mr-1" />
                          Core
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                        {story.word_count} {t("common.words", undefined, "words")}
                      </span>
                    </div>

                    <CardTitle className="text-base mt-2 font-bold text-foreground">
                      {story.title}
                    </CardTitle>

                    {story.author_style && (
                      <CardDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {story.author_style}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="text-xs font-serif text-muted-foreground line-clamp-4 bg-surface-hover/60 p-2.5 rounded-lg leading-relaxed">
                      {story.text}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        onClick={() => setModalStory(story)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                        {t("train.readStory", undefined, "Read Full Story")}
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => handleCopy(story.id, story.text)}
                          title={t("common.copy", undefined, "Copy")}
                        >
                          {copiedId === story.id ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => handleDownload(story)}
                          title={t("common.download", undefined, "Download")}
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Story Modal */}
      {modalStory && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalStory(null)}
        >
          <div
            className="bg-surface rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface-hover/40">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {modalStory.genre && (
                    <Badge className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] px-2 py-0">
                      {modalStory.genre}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground font-medium">
                    {modalStory.word_count} {t("common.words", undefined, "words")}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{modalStory.title}</h3>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setModalStory(null)}
              >
                ✕
              </Button>
            </div>

            <div className="p-6 overflow-y-auto text-sm font-serif leading-relaxed text-foreground whitespace-pre-wrap select-text space-y-4 story-paper">
              {modalStory.text}
            </div>

            <div className="p-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-surface-hover/30">
              <span className="text-xs text-muted-foreground truncate">
                TaleForge Master Stories Collection
              </span>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(modalStory.id, modalStory.text)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  {copiedId === modalStory.id ? t("common.copied", undefined, "Copied!") : t("common.copy", undefined, "Copy")}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(modalStory)}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  {t("common.download", undefined, "Download")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
