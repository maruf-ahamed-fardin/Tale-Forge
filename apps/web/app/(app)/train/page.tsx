"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileText,
  FileUp,
  GraduationCap,
  Info,
  Lock,
  PenTool,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
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
  const [inputMode, setInputMode] = useState<"write" | "file">("write");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [training, setTraining] = useState(false);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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

  const processFile = async (file: File) => {
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
      const res = await simpleAiApi().trainFile(file, title.trim() || file.name.replace(/\.[^/.]+$/, ""), currentAccountId);
      setMsg({ type: "success", text: res.message });
      setTitle("");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
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
    (currentAccountId !== "default_local_author" ? currentAccountId : "Local Author");

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = text.length;
  const readEstimateMin = Math.max(1, Math.ceil(wordCount / 180));

  return (
    <section className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-12">
      {/* ── 1. Modern Atmospheric Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-border/70">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
              {language === "bn" ? "এআই সাহিত্য ও স্টাইল প্রশিক্ষণ" : "AI Style & Vocabulary Forge"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border/80 text-xs text-muted-foreground font-medium shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[160px] font-mono font-semibold">{accountDisplay}</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground font-display tracking-tight flex items-center gap-2 sm:gap-2.5">
            <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <GraduationCap className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </span>
            {t("train.title", undefined, "Train AI on Your Stories")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {t(
              "train.subtitle",
              undefined,
              "Upload your personal literature, essays, and stories to fine-tune the AI's vocabulary, dialogue style, and narrative cadence."
            )}
          </p>
        </div>
      </div>

      {/* ── 2. Interactive Telemetry Cards & Primary Tab Selectors ── */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        {/* Personal Account Training Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab("personal")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveTab("personal")}
          className={cn(
            "group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer backdrop-blur-xl text-left overflow-hidden",
            activeTab === "personal"
              ? "border-primary/80 bg-surface/90 ring-2 ring-primary/30 shadow-card-elevated"
              : "border-border/80 bg-surface/60 hover:bg-surface/85 hover:border-primary/40 hover:-translate-y-0.5"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all",
                  activeTab === "personal"
                    ? "bg-primary text-white scale-105"
                    : "bg-surface-hover text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                )}
              >
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                    {t("train.tabPersonal", undefined, "Personal Stories")}
                  </h2>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Model Active" />
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-[170px] font-mono">
                  {accountDisplay}
                </p>
              </div>
            </div>

            {activeTab === "personal" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/25">
                <Check className="h-3 w-3" /> Active
              </span>
            ) : (
              <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-surface-hover">
                Select
              </span>
            )}
          </div>

          <div className="mt-4 flex items-baseline gap-4 pt-3 border-t border-border/60">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-foreground font-display">
                {personalStories.length}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5 font-semibold">
                {language === "bn" ? "টি গল্প" : personalStories.length === 1 ? "Story" : "Stories"}
              </span>
            </div>
            <span className="text-muted-foreground/40 text-lg">•</span>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-foreground font-display">
                {(status?.personal_words || 0).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">
                {t("common.words", undefined, "words")}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
            {language === "bn"
              ? "আপনার নিজস্ব আপলোড করা গল্প ও লেখার স্টাইল"
              : "Personal writing style, tone, and character voice"}
          </p>
        </div>

        {/* Default Master Literature Stats Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab("default")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveTab("default")}
          className={cn(
            "group relative p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer backdrop-blur-xl text-left overflow-hidden",
            activeTab === "default"
              ? "border-amber-500/80 bg-surface/90 ring-2 ring-amber-500/30 shadow-card-elevated"
              : "border-border/80 bg-surface/60 hover:bg-surface/85 hover:border-amber-500/40 hover:-translate-y-0.5"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all",
                  activeTab === "default"
                    ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm scale-105"
                    : "bg-surface-hover text-muted-foreground group-hover:text-amber-500 group-hover:bg-amber-500/10"
                )}
              >
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {t("train.tabDefault", undefined, "Default Curated Library")}
                  </h2>
                  <span className="flex h-2 w-2 rounded-full bg-amber-500" title="Core Benchmark" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Bengali Classics Benchmark
                </p>
              </div>
            </div>

            {activeTab === "default" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/25">
                <Check className="h-3 w-3" /> Active
              </span>
            ) : (
              <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-surface-hover">
                Select
              </span>
            )}
          </div>

          <div className="mt-4 flex items-baseline gap-4 pt-3 border-t border-border/60">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-foreground font-display">
                {defaultStories.length}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5 font-semibold">
                {language === "bn" ? "টি মাস্টারপিস" : "Master Stories"}
              </span>
            </div>
            <span className="text-muted-foreground/40 text-lg">•</span>
            <div>
              <span className="text-xl sm:text-2xl font-bold text-foreground font-display">
                {(status?.default_words || 0).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">
                {t("common.words", undefined, "words")}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
            {language === "bn"
              ? "হুমায়ূন, সত্যজিৎ ও রবীন্দ্র ধারার ক্লাসিক সাহিত্যিক গল্প"
              : "Foundational prose cadence, dialogue, and Bengali vocabulary"}
          </p>
        </div>
      </div>

      {/* ── 3. Sleek Segmented Pill Switcher ── */}
      <div className="flex items-center p-1.5 bg-surface/80 backdrop-blur-xl rounded-2xl border border-border/80 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className={cn(
            "flex-1 py-2 px-2.5 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2",
            activeTab === "personal"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover/60"
          )}
        >
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate sm:hidden">{language === "bn" ? "নিজস্ব" : "Personal"}</span>
          <span className="hidden sm:inline truncate">{t("train.tabPersonal", undefined, "Personal Stories")}</span>
          <span
            className={cn(
              "text-xs px-1.5 sm:px-2 py-0.2 rounded-full font-bold shrink-0",
              activeTab === "personal" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {personalStories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("default")}
          className={cn(
            "flex-1 py-2 px-2.5 sm:px-4 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2",
            activeTab === "default"
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover/60"
          )}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span className="truncate sm:hidden">{language === "bn" ? "ডিফল্ট" : "Default"}</span>
          <span className="hidden sm:inline truncate">{t("train.tabDefault", undefined, "Default Curated Library")}</span>
          <span
            className={cn(
              "text-xs px-1.5 sm:px-2 py-0.2 rounded-full font-bold shrink-0",
              activeTab === "default" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {defaultStories.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: PERSONAL AI TRAINING ── */}
      {activeTab === "personal" && (
        <div className="space-y-6">
          {/* Account Isolation & Privacy Glass Banner */}
          <div className="rounded-2xl border border-border/80 bg-surface/70 backdrop-blur-xl p-4 sm:p-4.5 flex items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    {language === "bn"
                      ? "নিরাপদ ও ব্যক্তিগত অ্যাকাউন্ট আইসোলেশন"
                      : "Private Account Model Isolation"}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    Encrypted
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {language === "bn"
                    ? `আপনার আপলোড করা লেখা কেবল আপনার এই অ্যাকাউন্টে (${accountDisplay}) সীমাবদ্ধ এবং সম্পূর্ণ ব্যক্তিগত।`
                    : `Training data is strictly isolated to your author workspace (${accountDisplay}) and never exposed to other users.`}
                </p>
              </div>
            </div>
          </div>

          {/* Training Studio Input Card */}
          <Card className="border-border/80 bg-surface/90 backdrop-blur-xl shadow-card-elevated rounded-3xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-display">
                    <Zap className="h-5 w-5 text-primary" />
                    {t("train.manualTitle", undefined, "Ingest New Story into AI Memory")}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">
                    {t(
                      "train.manualSubtitle",
                      undefined,
                      "Paste a story directly or drop document files (.txt, .pdf, .docx) to fine-tune the model."
                    )}
                  </CardDescription>
                </div>

                {/* Input Mode Toggle: Write vs File */}
                <div className="flex items-center p-1 rounded-xl bg-surface-hover/80 border border-border text-xs font-semibold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setInputMode("write")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
                      inputMode === "write"
                        ? "bg-surface text-primary shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    <span>{language === "bn" ? "লিখুন বা পেস্ট করুন" : "Write / Paste"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("file")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
                      inputMode === "file"
                        ? "bg-surface text-primary shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileUp className="h-3.5 w-3.5" />
                    <span>{language === "bn" ? "ডকুমেন্ট ফাইল" : "Upload File"}</span>
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-4">
              {/* Optional Story Title */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("train.storyTitleLabel", undefined, "Story Title")}
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t(
                    "train.storyTitlePlaceholder",
                    undefined,
                    "e.g., A Forgotten Afternoon in Rajshahi / একটি বৃষ্টির অলস দুপুর"
                  )}
                  className="mt-1.5 rounded-xl border-border/80 bg-surface/70 focus:border-primary text-sm h-10"
                />
              </div>

              {/* Mode A: Write or Paste */}
              {inputMode === "write" ? (
                <form onSubmit={handleTrain} className="space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t("train.storyContentLabel", undefined, "Story Content")}
                      </label>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{wordCount.toLocaleString()}</span> {t("common.words", undefined, "words")}
                        <span>•</span>
                        <span>{charCount.toLocaleString()} {t("common.characters", undefined, "chars")}</span>
                        {wordCount > 50 && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-primary">
                              <Clock className="h-3 w-3" />
                              {readEstimateMin} min read
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t(
                        "train.storyContentPlaceholder",
                        undefined,
                        "Paste your story text here in Bangla or English (dialogues, descriptions, narrative rhythm)..."
                      )}
                      className="w-full min-h-[180px] rounded-2xl border border-border/80 bg-surface/60 p-4 text-sm sm:text-base font-serif leading-relaxed text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y shadow-2xs"
                      required
                    />
                  </div>

                  {/* Feedback Message */}
                  {msg && (
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-2xl p-3.5 text-xs sm:text-sm border animate-in fade-in-50",
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
                      <span className="font-medium">{msg.text}</span>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => setInputMode("file")}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5 text-primary" />
                      <span>{language === "bn" ? "ফাইল হিসেবে আপলোড করতে চান? এখানে ক্লিক করুন" : "Prefer uploading a file document (.docx, .pdf, .txt)?"}</span>
                    </button>

                    <Button
                      type="submit"
                      disabled={training || !text.trim()}
                      className="rounded-2xl bg-primary px-6 py-2.5 font-bold text-white hover:brightness-110 active:scale-95 transition-all self-end sm:self-auto border-0"
                    >
                      {training ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {t("train.trainingProgress", undefined, "Training in progress...")}
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          {t("train.trainButton", undefined, "Train AI on this Story")}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                /* Mode B: Modern File Dropzone */
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.pdf,.docx,.doc"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3",
                      isDragging
                        ? "border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]"
                        : "border-border/80 bg-surface/50 hover:border-primary/50 hover:bg-surface-hover/50"
                    )}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-sm">
                      <FileUp className={cn("h-7 w-7 transition-transform", isDragging && "scale-110 animate-bounce")} />
                    </div>

                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-foreground">
                        {language === "bn"
                          ? "ফাইলটি এখানে টেনে এনে ছাড়ুন অথবা নির্বাচন করুন"
                          : "Drag & drop manuscript document here, or browse"}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("train.supportedFormats", undefined, "Supports TXT, PDF, DOCX, DOC (up to 20MB)")}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-surface-hover text-muted-foreground border border-border/60">
                        .TXT
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-surface-hover text-muted-foreground border border-border/60">
                        .PDF
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-surface-hover text-muted-foreground border border-border/60">
                        .DOCX
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-surface-hover text-muted-foreground border border-border/60">
                        .DOC
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={training}
                      className="mt-2 rounded-xl border-primary/40 text-primary hover:bg-primary/10"
                    >
                      {training ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Processing File...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          Browse Files
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Feedback Message */}
                  {msg && (
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-2xl p-3.5 text-xs sm:text-sm border animate-in fade-in-50",
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
                      <span className="font-medium">{msg.text}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Trained Stories Showcase List */}
          <Card className="border-border/80 bg-surface/90 backdrop-blur-xl shadow-card-elevated rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-display">
                  <User className="h-4 w-4 text-primary" />
                  {t("train.trainedStoriesList", undefined, "Your Trained Stories")}
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  {personalStories.length > 0
                    ? `${personalStories.length} ${language === "bn" ? "টি গল্প এআই মেমোরিতে সক্রিয়" : "stories active in your AI memory"}`
                    : t("train.noPersonalStories", undefined, "No personal stories trained yet.")}
                </CardDescription>
              </div>

              {personalStories.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground px-2.5 py-1 rounded-xl bg-surface-hover border border-border/70">
                    {(status?.personal_words || 0).toLocaleString()} {t("common.words", undefined, "words learned")}
                  </span>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {personalStories.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/80 p-8 sm:p-10 text-center bg-surface/40">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <User className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {t("train.noPersonalStories", undefined, "No personal stories yet")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
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
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9 h-10 text-xs rounded-xl border-border/80 bg-surface/70"
                        placeholder={t("stories.searchPlaceholder", undefined, "Search trained stories by title or content...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2.5">
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
                        <div
                          key={story.id}
                          className="p-4 rounded-2xl border border-border/80 bg-surface/75 hover:bg-surface hover:border-primary/40 transition-all shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            {/* Title & Info */}
                            <div
                              className="flex items-start gap-3 cursor-pointer flex-1 min-w-0"
                              onClick={() => setExpandedStoryId(isExpanded ? null : story.id)}
                            >
                              <div className="rounded-xl bg-primary/10 p-2 text-primary mt-0.5 shrink-0 shadow-2xs">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-sm text-foreground truncate">
                                    {story.title}
                                  </span>
                                  <Badge variant="primary" className="text-xs px-2 py-0.2 rounded-md">
                                    Personal
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <span className="font-semibold text-foreground/80">
                                    {story.word_count.toLocaleString()} {t("common.words", undefined, "words")}
                                  </span>
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
                            <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 shrink-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-0 w-full sm:w-auto">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl"
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
                                    {t("train.readStory", undefined, "Preview")}
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-xl"
                                onClick={() => setModalStory(story)}
                                title="Full screen reader"
                              >
                                <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-xl"
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
                                className="h-8 w-8 p-0 rounded-xl"
                                onClick={() => handleDownload(story)}
                                title={t("common.download", undefined, "Download")}
                              >
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-8 px-2 text-xs font-semibold rounded-xl transition-colors",
                                  isConfirming
                                    ? "bg-red-500/10 text-red-600 border border-red-500/30 hover:bg-red-500/20"
                                    : "text-muted-foreground hover:text-red-600"
                                )}
                                onClick={() => handleDeleteStory(story.id)}
                                disabled={isDeleting}
                                title={t("common.delete", undefined, "Delete")}
                              >
                                {isDeleting ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-red-600" />
                                ) : isConfirming ? (
                                  <span className="text-xs font-bold text-red-600">
                                    {t("common.confirm", undefined, "Confirm?")}
                                  </span>
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Text Preview */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border/70 animate-in fade-in-50">
                              <div className="max-h-64 overflow-y-auto rounded-xl bg-surface-hover/70 p-4 text-xs sm:text-sm font-serif leading-relaxed text-foreground whitespace-pre-wrap select-text border border-border/60">
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

      {/* ── TAB 2: DEFAULT AI MASTER STORIES ── */}
      {activeTab === "default" && (
        <div className="space-y-6">
          {/* Default Collection Banner */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
              <strong className="font-bold text-amber-700 dark:text-amber-300 block mb-0.5">
                {t("train.defaultStoriesList", undefined, "Pre-trained Classic Bengali Masterpieces")}
              </strong>
              {language === "bn"
                ? "আমাদের AI ইঞ্জিন নিচে উল্লেখিত অমর সাহিত্যিক গল্পসমূহ দ্বারা উচ্চপর্যায়ে প্রশিক্ষিত। এটি নিখুঁত ব্যাকরণ, সাহিত্যরস, উপমা ও চরিত্র নির্মাণের ভিত্তি।"
                : "The core AI engine comes pre-trained with these classic literary masterpieces, setting the benchmark for storytelling cadence, metaphor richness, and Bengali prose."}
            </div>
          </div>

          {/* Search default stories */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-10 text-xs rounded-xl border-border/80 bg-surface/70"
              placeholder={t("stories.searchPlaceholder", undefined, "Search classic stories by title, author, or genre...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Master Stories Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredStories.map((story) => {
              return (
                <Card
                  key={story.id}
                  className="border-border/80 hover:border-amber-500/50 transition-all bg-surface/85 backdrop-blur-xl rounded-3xl flex flex-col justify-between shadow-card-elevated group"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {story.genre && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 font-bold border border-amber-500/25 rounded-md">
                            {story.genre}
                          </Badge>
                        )}
                        <Badge variant="neutral" className="text-xs text-muted-foreground rounded-md">
                          <Lock className="h-2.5 w-2.5 mr-1" />
                          Core Model
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold shrink-0">
                        {story.word_count.toLocaleString()} {t("common.words", undefined, "words")}
                      </span>
                    </div>

                    <CardTitle className="text-base mt-2.5 font-bold text-foreground font-display group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {story.title}
                    </CardTitle>

                    {story.author_style && (
                      <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {story.author_style}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="text-xs font-serif text-muted-foreground line-clamp-4 bg-surface-hover/70 p-3.5 rounded-2xl leading-relaxed border border-border/50">
                      &ldquo;{story.text}&rdquo;
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-border/70">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold rounded-xl border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                        onClick={() => setModalStory(story)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
                        {t("train.readStory", undefined, "Read Full Story")}
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-xl"
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
                          className="h-8 w-8 p-0 rounded-xl"
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

      {/* ── 4. Elegant Full-Screen Reading Modal ── */}
      {modalStory && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50"
          onClick={() => setModalStory(null)}
        >
          <div
            className="bg-surface rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-border/80 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border/70 flex items-center justify-between bg-surface-hover/40">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {modalStory.genre && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded-md font-bold">
                      {modalStory.genre}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground font-semibold">
                    {modalStory.word_count.toLocaleString()} {t("common.words", undefined, "words")}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground font-display">{modalStory.title}</h3>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setModalStory(null)}
              >
                ✕
              </Button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto text-sm sm:text-base font-serif leading-relaxed text-foreground whitespace-pre-wrap select-text space-y-4 story-paper">
              {modalStory.text}
            </div>

            <div className="p-4 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-surface-hover/30">
              <span className="text-xs text-muted-foreground truncate">
                TaleForge Literary Repository
              </span>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => handleCopy(modalStory.id, modalStory.text)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  {copiedId === modalStory.id ? t("common.copied", undefined, "Copied!") : t("common.copy", undefined, "Copy")}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
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
