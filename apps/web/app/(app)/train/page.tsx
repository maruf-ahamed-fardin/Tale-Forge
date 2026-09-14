"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  GraduationCap,
  MessageSquare,
  Plus,
  RefreshCw,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { simpleAiApi, type AIStatus } from "@/lib/api";

export default function SimpleTrainPage() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [training, setTraining] = useState(false);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch {
      setMsg({ type: "error", text: "File upload training failed." });
    } finally {
      setTraining(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1f1b2d] flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Train AI with Your Stories (AI মডেল ট্রেইন করুন)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            এখানে আপনার গল্প বা লেখা দিন। AI সেগুলোর স্টাইল, ভাষা ও চরিত্র শিখে নিবে।
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
                Trained Stories in AI Memory
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
                Total Words Learned by AI
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
            নিচের বক্সে আপনার লেখা গল্প পেস্ট করুন অথবা সরাসরি .txt ফাইল আপলোড করুন।
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
                placeholder="যেমন: একাকী দুপুর / A Quiet Rain"
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
                className="mt-1.5 min-h-[220px] w-full rounded-lg border border-border p-4 text-sm font-serif leading-relaxed text-[#292524] outline-none focus:border-primary"
                required
              />
            </div>

            {msg && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                  msg.type === "success"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {msg.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{msg.text}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={training}
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  Upload .txt File
                </Button>
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

      {/* Currently Trained Stories List */}
      {status && status.recent_stories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stories in AI Knowledge Base</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {status.recent_stories.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm text-[#292524]">{s.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="neutral">{s.word_count} words</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
