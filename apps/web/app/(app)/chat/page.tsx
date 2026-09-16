"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Download,
  GraduationCap,
  Image as ImageIcon,
  Library,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { simpleAiApi, storiesApi, type AIStatus } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  autoTrained?: boolean;
  model?: string;
  saved?: boolean;
  imageUrl?: string;
}

interface ImageAttachment {
  file: File;
  dataUrl: string;
  base64: string;
  type: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "নমস্কার / Hello! আমি আপনার TaleForge AI। আপনি আমাকে যে গল্প বা ডাটা দিয়ে ট্রেইন করেছেন, আমি তার উপর ভিত্তি করে নতুন নতুন গল্প লিখবো।\n\nআপনি কী ধরণের গল্প তৈরি করতে চান? যেমন: 'একটি বৃষ্টির রাতের রোমান্টিক গল্প' বা 'Write a mystery story'।\n\n🎨 আপনি চাইলে সরাসরি কোনো ছবি (Image) আপলোড করেও গল্প তৈরি করাতে পারেন! ছবি পাঠালে AI ছবিটি দেখে সম্পূর্ণ বাংলা গল্প রচনা করবে।",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoTrain, setAutoTrain] = useState(true);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedStoriesMap, setSavedStoriesMap] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<ImageAttachment | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const refreshStatus = () => {
    simpleAiApi()
      .status()
      .then((data) => setAiStatus(data))
      .catch(() => {});
  };

  useEffect(() => {
    refreshStatus();
    if (typeof window !== "undefined") {
      setHasGeminiKey(Boolean(localStorage.getItem("tf_gemini_api_key")));
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToastMsg("দয়া করে একটি সঠিক ইমেজ ফাইল (.jpg, .png, .webp) নির্বাচন করুন।");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] || "";
      setAttachedImage({
        file,
        dataUrl,
        base64,
        type: file.type || "image/jpeg",
      });
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = inputPrompt.trim();
    if ((!prompt && !attachedImage) || loading) return;

    const userMsgText = prompt || "এই ছবিটি দেখে একটি জীবন্ত ও চমৎকার গল্প লিখুন।";
    const currentImage = attachedImage;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: userMsgText,
      imageUrl: currentImage?.dataUrl,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setAttachedImage(null);
    setLoading(true);

    try {
      const res = await simpleAiApi().chat(
        prompt,
        autoTrain,
        currentImage?.base64,
        currentImage?.type,
      );

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: res.story,
        autoTrained: res.auto_trained,
        model: res.model,
      };
      setMessages((prev) => [...prev, aiMsg]);
      refreshStatus();
    } catch (err: unknown) {
      const errDetail = err instanceof Error ? err.message : "গল্প তৈরিতে সমস্যা হয়েছে।";
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `দুঃখিত, গল্প তৈরিতে সমস্যা হয়েছে: ${errDetail}\n\nটিপ: আপনি Settings পেজে গিয়ে আপনার বিনামূল্যে পাওয়া Google Gemini API Key যোগ করে নিতে পারেন।`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyStory = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveToStories = async (id: string, text: string) => {
    if (savingId === id || savedStoriesMap[id]) return;
    setSavingId(id);

    // Extract evocative title
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    let title = "AI Generated Story";
    for (const l of lines) {
      const clean = l.replace(/^[#*\-_\s]+/, "").trim();
      if (clean && clean.length > 2) {
        title = clean.slice(0, 60);
        break;
      }
    }

    try {
      await storiesApi().create({
        title,
        content: text,
        genre: "AI Generated",
        mood: "Literary",
      });

      setSavedStoriesMap((prev) => ({ ...prev, [id]: true }));
      setToastMsg(`"${title}" লাইব্রেরিতে সেভ করা হয়েছে!`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "গল্প সেভ করতে সমস্যা হয়েছে";
      setToastMsg(`Error: ${errorText}`);
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setSavingId(null);
    }
  };

  const handleDownloadStory = (text: string) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    let title = "generated_story";
    for (const l of lines) {
      const clean = l.replace(/^[#*\-_\s]+/, "").trim();
      if (clean) {
        title = clean.replace(/[^a-z0-9\u0980-\u09FF_-]+/gi, "_").slice(0, 40);
        break;
      }
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex flex-col h-[calc(100dvh-125px)] sm:h-[calc(100vh-120px)] max-w-5xl mx-auto">
      {/* Top Header & Model Status */}
      <div className="flex flex-col gap-2 pb-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#1f1b2d] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Story Chat & Multimodal Generator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            চ্যাট করুন, ছবি বা টেক্সট থেকে গল্প তৈরি করুন এবং পছন্দমতো সেভ বা ডাউনলোড করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasGeminiKey ? (
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
              title="Google Gemini Live Vision AI Connected"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live AI: Google Gemini Vision
            </Link>
          ) : (
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
              title="Click to connect free Google Gemini API key for deep visual reasoning"
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              TaleForge Engine (+ Connect Gemini Key)
            </Link>
          )}

          <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-primary border border-indigo-200">
            {aiStatus ? `${aiStatus.total_trained_stories} Trained Stories` : "Ready"}
          </div>

          <Link
            href="/train"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90 transition shadow-sm"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Train Stories
          </Link>

          <Link
            href="/stories"
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-neutral-50 transition shadow-sm"
          >
            <Library className="h-3.5 w-3.5 text-primary" />
            My Library
          </Link>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="my-2 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-medium text-emerald-800 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
          <Link
            href="/stories"
            className="underline font-semibold text-emerald-900 hover:text-emerald-700 ml-3"
          >
            Go to Stories Library &rarr;
          </Link>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((m) => {
          const isUser = m.role === "user";
          const isSaved = savedStoriesMap[m.id];
          const isSaving = savingId === m.id;

          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm"
                    : "bg-surface border border-border text-[#292524] rounded-tl-none shadow-sm"
                }`}
              >
                {/* Uploaded User Image Thumbnail */}
                {m.imageUrl && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-white/20 max-w-sm shadow-md bg-black/10">
                    <img
                      src={m.imageUrl}
                      alt="Uploaded scene"
                      className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition"
                      onClick={() => window.open(m.imageUrl, "_blank")}
                    />
                  </div>
                )}

                <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed sm:text-base">
                  {m.content}
                </div>

                {!isUser && m.id !== "welcome" && (
                  <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-emerald-700 font-medium">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span>{m.autoTrained ? "Auto-Trained & Saved" : "Generated"}</span>
                      </div>
                      {m.model && (
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-primary border border-indigo-200">
                          {m.model}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Copy */}
                      <button
                        type="button"
                        onClick={() => handleCopyStory(m.id, m.content)}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold transition"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedId === m.id ? "Copied!" : "Copy"}
                      </button>
                      <span>•</span>

                      {/* Download */}
                      <button
                        type="button"
                        onClick={() => handleDownloadStory(m.content)}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold transition"
                        title="Download story as .txt"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                      <span>•</span>

                      {/* Save to Stories Library */}
                      {isSaved ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <Check className="h-3.5 w-3.5" />
                          <span>Saved in Library</span>
                          <Link
                            href="/stories"
                            className="underline text-[11px] ml-1 text-primary hover:text-primary/80"
                          >
                            View &rarr;
                          </Link>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSaveToStories(m.id, m.content)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold transition disabled:opacity-60"
                        >
                          {isSaving ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            <>
                              <BookOpen className="h-3.5 w-3.5" />
                              Save Story (সংরক্ষণ)
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-primary">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none border border-border bg-surface px-5 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>
                  {attachedImage
                    ? "AI ছবিটি বিশ্লেষণ করছে এবং ছবি অনুযায়ী গল্প রচনা করছে…"
                    : "আপনার ট্রেইন করা ডাটার ওপর নতুন গল্প তৈরি ও অটো-ট্রেইনিং হচ্ছে…"}
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="pt-2 border-t border-border">
        {/* Attached Image Preview Chip */}
        {attachedImage && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-indigo-50/90 border border-indigo-200 px-3 py-1.5 text-xs text-primary w-fit shadow-xs animate-fade-in">
            <img
              src={attachedImage.dataUrl}
              alt="Attached preview"
              className="h-7 w-7 rounded-md object-cover border border-indigo-300/50"
            />
            <span className="font-semibold truncate max-w-[220px]">
              {attachedImage.file.name}
            </span>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="p-1 text-muted-foreground hover:text-red-600 transition"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={autoTrain}
                onChange={(e) => setAutoTrain(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-primary accent-primary"
              />
              <span>⚡ Auto-Retrain: নতুন গল্পটি সরাসরি মডেলের স্মৃতিতে সেভ করে অটো-ট্রেইন করুন</span>
            </label>
          </div>

          <div className="flex gap-2 items-center">
            {/* Hidden File Input for Image Upload */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Image Attachment Button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => imageInputRef.current?.click()}
              className="h-12 w-12 shrink-0 border-border bg-white hover:bg-neutral-50 hover:text-primary shadow-xs"
              title="ছবি আপলোড করে গল্প বানান (Upload Image for Story)"
            >
              <ImageIcon className="h-5 w-5 text-primary" />
            </Button>

            <Input
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={
                attachedImage
                  ? "ছবিটি নিয়ে কিছু বলতে চাইলে লিখুন (বা সরাসরি Generate চাপুন)..."
                  : "কী ধরনের গল্প চান লিখুন অথবা বামের বাটন চেপে ছবি দিন..."
              }
              className="h-12 text-sm bg-white"
              disabled={loading}
              autoFocus
            />

            <Button
              type="submit"
              disabled={loading || (!inputPrompt.trim() && !attachedImage)}
              className="h-12 px-3 sm:px-5 shrink-0"
            >
              <Send className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Generate</span>
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
