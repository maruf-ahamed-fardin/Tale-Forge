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

export default function SimpleTrainPage() {
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
    const user = getStoredUser();
    setCurrentUser(user);
    loadStatus();
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
        text: err instanceof Error ? err.message : "ব্যক্তিগত AI প্রশিক্ষণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।",
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
      const res = await simpleAiApi().trainFile(file, title, currentAccountId);
      setMsg({ type: "success", text: res.message });
      loadStatus();
    } catch (err: unknown) {
      setMsg({
        type: "error",
        text: err instanceof Error ? err.message : "ফাইল থেকে প্রশিক্ষণ ব্যর্থ হয়েছে।",
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
        text: "গল্পটি সফলভাবে আপনার অ্যাকাউন্টের মেমোরি থেকে মুছে ফেলা হয়েছে।",
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
    (currentAccountId !== "default_local_author" ? `Account: ${currentAccountId}` : "আমার লোকাল স্পেস");

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-[#1f1b2d] flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              AI Training Center (AI মডেল প্রশিক্ষণ কেন্দ্র)
            </h1>
            <Badge variant="primary" className="text-xs px-2.5 py-0.5">
              <User className="h-3 w-3 mr-1" />
              {accountDisplay}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ডিফল্ট সাহিত্য ভাণ্ডারের পাশাপাশি আপনার বর্তমান অ্যাকাউন্টের জন্য নিজস্ব টেক্সট দিয়ে আলাদাভাবে AI কে ট্রেইন করুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/chat" className={buttonVariants()}>
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Go to Story Chat
          </Link>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Personal Account Training Stats */}
        <Card
          className={`cursor-pointer transition-all ${
            activeTab === "personal"
              ? "border-primary bg-indigo-50/40 ring-2 ring-primary/20 shadow-sm"
              : "border-border hover:border-primary/40 bg-white"
          }`}
          onClick={() => setActiveTab("personal")}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-primary p-3 text-white shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Personal AI (ব্যক্তিগত)
                </span>
                <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  শুধুমাত্র এই অ্যাকাউন্টে
                </span>
              </div>
              <div className="text-2xl font-black text-[#1f1b2d] mt-0.5">
                {personalStories.length} <span className="text-sm font-normal text-muted-foreground">গল্প</span>
                <span className="text-muted-foreground mx-1.5 font-light">|</span>
                <span className="text-lg font-bold text-[#1f1b2d]">
                  {(status?.personal_words || 0).toLocaleString()}
                </span>{" "}
                <span className="text-xs font-normal text-muted-foreground">শব্দ</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
                আপনার নিজস্ব আপলোড করা গল্প ও লেখার স্টাইল
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Default Master Literature Stats */}
        <Card
          className={`cursor-pointer transition-all ${
            activeTab === "default"
              ? "border-amber-500 bg-amber-50/30 ring-2 ring-amber-500/20 shadow-sm"
              : "border-border hover:border-amber-500/40 bg-white"
          }`}
          onClick={() => setActiveTab("default")}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-amber-500 p-3 text-white shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Default AI (ডিফল্ট সাহিত্য)
                </span>
                <span className="text-[11px] bg-amber-500/10 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                  সবার জন্য সক্রিয়
                </span>
              </div>
              <div className="text-2xl font-black text-[#1f1b2d] mt-0.5">
                {defaultStories.length} <span className="text-sm font-normal text-muted-foreground">গল্প</span>
                <span className="text-muted-foreground mx-1.5 font-light">|</span>
                <span className="text-lg font-bold text-[#1f1b2d]">
                  {(status?.default_words || 0).toLocaleString()}
                </span>{" "}
                <span className="text-xs font-normal text-muted-foreground">শব্দ</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
                হুমায়ূন, সত্যজিৎ ও রবীন্দ্র ধারার ক্লাসিক সাহিত্যিক গল্প
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-xl border border-border">
        <button
          onClick={() => setActiveTab("personal")}
          className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === "personal"
              ? "bg-white text-primary shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          <span>ব্যক্তিগত AI প্রশিক্ষণ (Personal AI - My Account)</span>
          {personalStories.length > 0 && (
            <span className="bg-primary/10 text-primary text-[11px] px-1.5 py-0.2 rounded-full">
              {personalStories.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("default")}
          className={`flex-1 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === "default"
              ? "bg-white text-amber-700 shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>ডিফল্ট সাহিত্য ভাণ্ডার (Default Master Stories)</span>
          <span className="bg-amber-500/10 text-amber-700 text-[11px] px-1.5 py-0.2 rounded-full">
            {defaultStories.length}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: PERSONAL AI TRAINING (MY ACCOUNT ONLY)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "personal" && (
        <div className="space-y-6">
          {/* Account Isolation Notice */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-[#292524] leading-relaxed">
              <strong className="font-semibold text-primary block text-sm mb-0.5">
                শুধুমাত্র আপনার এই অ্যাকাউন্টের জন্য ব্যক্তিগত প্রশিক্ষণ
              </strong>
              এখানে আপনি যে লেখা বা ফাইল দেবেন, তা সম্পূর্ণ সুরক্ষিতভাবে কেবল আপনার এই অ্যাকাউন্টে
              ({accountDisplay}) AI মডেলকে শেখাবে। অন্য কোনো ব্যবহারকারীর কাছে এটি যাবে না।
              গল্প লেখার সময় <strong>'Personal AI'</strong> বা <strong>'Hybrid Mode'</strong> নির্বাচন করলেই AI আপনার
              অনন্য বাচনভঙ্গি ব্যবহার করবে।
            </div>
          </div>

          {/* Training Input Form */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                আপনার নিজস্ব টেক্সট বা ফাইল দিয়ে ট্রেইন করুন
              </CardTitle>
              <CardDescription>
                নিচের বক্সে আপনার লেখা পেস্ট করুন অথবা সরাসরি <strong>.docx</strong>, <strong>.doc</strong>,{" "}
                <strong>.pdf</strong> বা <strong>.txt</strong> ফাইল (বই, পাণ্ডুলিপি বা ওয়ার্ড ডকুমেন্ট) আপলোড করুন।
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTrain} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Story Title (গল্পের শিরোনাম)
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="যেমন: আমার প্রথম উপন্যাস / একটি বৃষ্টির রাত (ফাইল আপলোড করলে নাম স্বয়ংক্রিয়ভাবে নেবে)"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      Story Content (গল্পের মূল লেখা পেস্ট করুন)
                    </label>
                    <div className="text-xs text-muted-foreground">
                      {text.trim() ? `${text.trim().split(/\s+/).length} শব্দ` : "০ শব্দ"}
                    </div>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="এখানে আপনার সম্পূর্ণ গল্প, উপন্যাস বা নিজস্ব শৈলীর প্যারাগ্রাফ পেস্ট করুন..."
                    className="mt-1.5 min-h-[160px] w-full rounded-lg border border-border p-4 text-sm font-serif leading-relaxed text-[#292524] outline-none focus:border-primary"
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
                      Upload .docx / .doc / .pdf / .txt (ফাইল আপলোড)
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      সাপোর্ট: Word ফাইল (.docx, .doc), PDF (.pdf) ও টেক্সট (.txt)
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
                        Train Personal AI (ব্যক্তিগত AI ট্রেইন করুন)
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Personal Trained Stories List */}
          <Card className="border-border">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  My Account&apos;s Trained Stories (এই অ্যাকাউন্টে ট্রেইন করা গল্পসমূহ)
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {personalStories.length > 0
                    ? `আপনার অ্যাকাউন্টে মোট ${personalStories.length} টি ব্যক্তিগত গল্প সংরক্ষিত রয়েছে।`
                    : "আপনার অ্যাকাউন্টে এখনও কোনো ব্যক্তিগত গল্প যোগ করা হয়নি।"}
                </CardDescription>
              </div>

              {personalStories.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  মোট {(status?.personal_words || 0).toLocaleString()} শব্দ শেখা হয়েছে
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              {personalStories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center bg-neutral-50/50">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <User className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#1f1b2d]">কোনো ব্যক্তিগত গল্প নেই</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    আপনার লেখার স্টাইল, চরিত্র বা প্রিয় ভাষা AI-কে শেখাতে উপরের বক্সে টেক্সট পেস্ট করুন অথবা যেকোনো
                    বই/ফাইল আপলোড করুন।
                  </p>
                </div>
              ) : (
                <>
                  {personalStories.length > 2 && (
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-8 h-9 text-xs"
                        placeholder="আপনার ট্রেইন করা গল্প খুঁজুন..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  )}

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
                              onClick={() => setExpandedStoryId(isExpanded ? null : story.id)}
                            >
                              <div className="rounded-md bg-primary/10 p-1.5 text-primary mt-0.5 shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-[#292524] truncate">
                                    {story.title}
                                  </span>
                                  <Badge variant="primary" className="text-[10px] px-1.5 py-0">
                                    ব্যক্তিগত
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span>{story.word_count.toLocaleString()} শব্দ</span>
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
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                    Read
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={() => handleCopy(story.id, story.text)}
                                title="লেখা কপি করুন"
                              >
                                {copiedId === story.id ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={() => handleDownload(story)}
                                title="টেক্সট ফাইল ডাউনলোড করুন"
                              >
                                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 text-xs font-medium transition-colors ${
                                  isConfirming
                                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                                    : "text-muted-foreground hover:text-red-600"
                                }`}
                                onClick={() => handleDeleteStory(story.id)}
                                disabled={isDeleting}
                                title="গল্পটি মেমোরি থেকে মুছুন"
                              >
                                {isDeleting ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-red-600" />
                                ) : isConfirming ? (
                                  <span className="text-[11px] font-bold">Confirm?</span>
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Text Preview */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <div className="max-h-60 overflow-y-auto rounded bg-neutral-50 p-3.5 text-xs font-serif leading-relaxed text-[#292524] whitespace-pre-wrap select-text">
                                {story.text || "লেখার কোনো কনটেন্ট পাওয়া যায়নি।"}
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

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: DEFAULT AI MASTER STORIES (TALEFORGE CORE)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === "default" && (
        <div className="space-y-6">
          {/* Default Collection Banner */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-50/40 p-4 flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-[#292524] leading-relaxed">
              <strong className="font-semibold text-amber-800 block text-sm mb-0.5">
                TaleForge ডিফল্ট সাহিত্য ভাণ্ডার (সবার জন্য সর্বদা সক্রিয়)
              </strong>
              আমাদের AI মডেল ইতিমধ্যে নিচে দেওয়া এই ৬টি চমৎকার, সাহিত্যধর্মী মাস্টারপিস গল্প দিয়ে উচ্চপর্যায়ে
              প্রশিক্ষিত। এটি বাংলা ব্যাকরণ, সাহিত্যরস, উপমা, দৃশ্যপট ও ডায়ালগের জন্য মূল মানদণ্ড হিসেবে কাজ করে।
              এগুলো সিস্টেম-প্রটেক্টেড এবং সবসময় সক্রিয় থাকে।
            </div>
          </div>

          {/* Search default stories */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-xs"
              placeholder="ডিফল্ট সাহিত্য গল্প খুঁজুন (শিরোনাম বা সাহিত্যের ধারা দিয়ে)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Stories Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredStories.map((story) => {
              return (
                <Card key={story.id} className="border-border hover:border-amber-500/40 transition-all bg-white flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {story.genre && (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] px-2 py-0 font-medium">
                            {story.genre}
                          </Badge>
                        )}
                        <Badge variant="neutral" className="text-[10px] text-muted-foreground">
                          <Lock className="h-2.5 w-2.5 mr-1" />
                          ডিফল্ট কোর
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                        {story.word_count} শব্দ
                      </span>
                    </div>

                    <CardTitle className="text-base mt-2 font-bold text-[#1f1b2d]">
                      {story.title}
                    </CardTitle>

                    {story.author_style && (
                      <CardDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        বৈশিষ্ট্য: {story.author_style}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="text-xs font-serif text-neutral-600 line-clamp-4 bg-neutral-50 p-2.5 rounded-lg leading-relaxed">
                      {story.text}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium border-amber-500/30 text-amber-800 hover:bg-amber-50"
                        onClick={() => setModalStory(story)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 text-amber-600" />
                        সম্পূর্ণ গল্প পড়ুন
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => handleCopy(story.id, story.text)}
                          title="গল্পটি কপি করুন"
                        >
                          {copiedId === story.id ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => handleDownload(story)}
                          title="ডাউনলোড করুন"
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
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalStory(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between bg-neutral-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {modalStory.genre && (
                    <Badge className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0">
                      {modalStory.genre}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground font-medium">
                    {modalStory.word_count} শব্দ • বাংলা সাহিত্য
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1f1b2d]">{modalStory.title}</h3>
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

            <div className="p-6 overflow-y-auto text-sm font-serif leading-relaxed text-[#292524] whitespace-pre-wrap select-text space-y-4">
              {modalStory.text}
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between bg-neutral-50/30">
              <span className="text-xs text-muted-foreground">
                TaleForge Master Stories Collection
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(modalStory.id, modalStory.text)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  {copiedId === modalStory.id ? "কপি হয়েছে!" : "কপি করুন"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(modalStory)}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  ডাউনলোড
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
