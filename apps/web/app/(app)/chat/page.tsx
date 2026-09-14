"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Copy,
  GraduationCap,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { simpleAiApi, storiesApi, type AIStatus } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  autoTrained?: boolean;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "নমস্কার / Hello! আমি আপনার TaleForge AI। আপনি আমাকে যে গল্প বা ডাটা দিয়ে ট্রেইন করেছেন, আমি তার উপর ভিত্তি করে নতুন নতুন গল্প লিখবো।\n\nআপনি কী ধরণের গল্প তৈরি করতে চান? যেমন: 'একটি বৃষ্টির রাতের রোমান্টিক গল্প' বা 'Write a mystery story'.",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoTrain, setAutoTrain] = useState(true);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshStatus = () => {
    simpleAiApi()
      .status()
      .then((data) => setAiStatus(data))
      .catch(() => {});
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = inputPrompt.trim();
    if (!prompt || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: prompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setLoading(true);

    try {
      const res = await simpleAiApi().chat(prompt, autoTrain);
      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: res.story,
        autoTrained: res.auto_trained,
      };
      setMessages((prev) => [...prev, aiMsg]);
      refreshStatus();
    } catch {
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "দুঃখিত, গল্প তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
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
    const firstLine = text.split("\n")[0].replace(/[#*]/g, "").trim();
    const title = firstLine.slice(0, 40) || "Generated Story";
    try {
      await storiesApi().create({
        title,
        content: text,
        genre: "AI Generated",
        mood: "Adaptive",
      });
      setSavedId(id);
      setTimeout(() => setSavedId(null), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto">
      {/* Top Header & Model Status */}
      <div className="flex flex-col gap-2 pb-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#1f1b2d] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Story Chat & Generator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            চ্যাট করুন এবং আপনার ট্রেইন করা ডাটার ওপর নতুন গল্প তৈরি করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {aiStatus ? `Trained on ${aiStatus.total_trained_stories} Stories` : "AI Model Ready"}
          </div>
          <Link
            href="/train"
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-primary border border-indigo-200 hover:bg-indigo-100 transition"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            + Train More Data
          </Link>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((m) => {
          const isUser = m.role === "user";
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
                <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed sm:text-base">
                  {m.content}
                </div>

                {!isUser && m.id !== "welcome" && (
                  <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span>{m.autoTrained ? "Auto-Trained: Model updated with this story" : "Generated"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyStory(m.id, m.content)}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold transition"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedId === m.id ? "Copied!" : "Copy"}
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => handleSaveToStories(m.id, m.content)}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-semibold transition"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {savedId === m.id ? "Saved to Library!" : "Save Story"}
                      </button>
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
                <span>আপনার ট্রেইন করা ডাটার ওপর নতুন গল্প তৈরি ও অটো-ট্রেইনিং হচ্ছে…</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="pt-2 border-t border-border">
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

          <div className="flex gap-2">
            <Input
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="কী ধরনের গল্প চান লিখুন (যেমন: একটি কুয়াশাচ্ছন্ন সকালের প্রেমের গল্প...)"
              className="h-12 text-sm bg-white"
              disabled={loading}
              autoFocus
            />
            <Button type="submit" disabled={loading || !inputPrompt.trim()} className="h-12 px-5">
              <Send className="h-4 w-4 mr-1.5" />
              Generate
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
