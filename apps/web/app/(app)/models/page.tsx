"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Check,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trainingApi, type TrainingRunOut } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface BaseModelInfo {
  id: string;
  name: string;
  architecture: string;
  contextLength: string;
  vramRequired: string;
  status: "Available" | "Recommended";
  desc: string;
}

const baseModels: BaseModelInfo[] = [
  {
    id: "bangla-llama-7b",
    name: "Bangla LLaMA 7B",
    architecture: "LLaMA 2 / 3 Tokenizer (Extended Bangla)",
    contextLength: "4,096 tokens",
    vramRequired: "4 GB (4-bit QLoRA) / 16 GB (FP16)",
    status: "Recommended",
    desc: "Foundation model fine-tuned on curated contemporary and classic Bangla literature. Best stylistic fidelity.",
  },
  {
    id: "mistral-7b-bangla",
    name: "Mistral 7B Bangla",
    architecture: "Mistral Sliding Window Attention",
    contextLength: "8,192 tokens",
    vramRequired: "4 GB (4-bit QLoRA) / 16 GB (FP16)",
    status: "Available",
    desc: "High generation velocity with strong narrative pacing and diverse dialogue cadence.",
  },
  {
    id: "qwen2.5-7b-instruct",
    name: "Qwen 2.5 7B Multi",
    architecture: "Qwen Dense Transformer",
    contextLength: "32,768 tokens",
    vramRequired: "5 GB (4-bit QLoRA) / 16 GB (FP16)",
    status: "Available",
    desc: "Extensive context window suitable for full novella planning, multi-chapter tracking, and worldbuilding.",
  },
];

export default function ModelsPage() {
  const { language } = useLanguage();
  const [runs, setRuns] = useState<TrainingRunOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModel, setActiveModel] = useState<string>("bangla-llama-7b");
  const [activeMsg, setActiveMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("tf_active_model");
    if (saved) setActiveModel(saved);

    trainingApi()
      .list()
      .then((data) => setRuns(data.runs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleActivateModel = (modelId: string, modelName: string) => {
    setActiveModel(modelId);
    localStorage.setItem("tf_active_model", modelId);
    setActiveMsg(
      language === "bn"
        ? `স্টোরি স্টুডিওর জন্য "${modelName}" সক্রিয় করা হয়েছে!`
        : `Activated "${modelName}" for Story Studio!`
    );
    setTimeout(() => setActiveMsg(""), 3500);
  };

  return (
    <section>
      <PageHeader
        eyebrow={language === "bn" ? "মডেলসমূহ" : "Models"}
        title={language === "bn" ? "মডেল ও অ্যাডাপ্টার রেজিস্ট্রি" : "Model & Adapter Registry"}
        description={
          language === "bn"
            ? "ফাউন্ডেশন মডেল পরিচালনা করুন এবং আপনার গল্প সৃষ্টির জন্য পছন্দের ফাইন-টিউনড LoRA অ্যাডাপ্টার নির্বাচন করুন।"
            : "Manage foundation models and choose which fine-tuned LoRA adapter powers your story generation."
        }
      >
        <Link href="/train" className={buttonVariants({ variant: "outline" })}>
          <Zap className="h-4 w-4 mr-1.5" />
          {language === "bn" ? "নতুন মডেল ট্রেইন করুন" : "Train AI Model"}
        </Link>
      </PageHeader>

      {/* Active Model Notification */}
      {activeMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-800 dark:text-emerald-300 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{activeMsg}</span>
        </div>
      )}

      {/* Currently Active Banner */}
      <Card className="mb-8 border-primary/40 bg-gradient-to-r from-primary/10 via-surface to-surface">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary p-3 text-white shadow-sm shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground">
                  {language === "bn" ? "সক্রিয় ইঞ্জিন: " : "Active Engine: "}{" "}
                  {baseModels.find((m) => m.id === activeModel)?.name || activeModel}
                </h3>
                <Badge variant="primary">
                  {language === "bn" ? "স্টুডিওতে সক্রিয়" : "Active in Studio"}
                </Badge>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {language === "bn"
                  ? "স্টোরি স্টুডিওর সকল গল্প তৈরি স্বয়ংক্রিয়ভাবে এই মডেল কনফিগারেশন ব্যবহার করবে।"
                  : "All generation requests from the Story Studio will automatically use this model configuration."}
              </p>
            </div>
          </div>
          <Link href="/studio" className={buttonVariants()}>
            {language === "bn" ? "স্টুডিও খুলুন" : "Open Studio"}
          </Link>
        </CardContent>
      </Card>

      {/* Base Models Grid */}
      <div className="mb-8 space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {language === "bn" ? "বেস ফাউন্ডেশন মডেলসমূহ" : "Base Foundation Models"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {language === "bn"
              ? "ফাইন-টিউনিং এবং লোকাল ইনফারেন্সের জন্য সমর্থিত ওপেন-ওয়েটস মডেলসমূহ।"
              : "Standard open-weights models supported for fine-tuning and local inference."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {baseModels.map((model) => {
            const isActive = activeModel === model.id;
            return (
              <Card
                key={model.id}
                className={`bg-surface flex flex-col justify-between transition-all ${
                  isActive ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-foreground">{model.name}</CardTitle>
                    <Badge variant={model.status === "Recommended" ? "primary" : "neutral"}>
                      {model.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1 text-xs">{model.desc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-surface-hover/50 p-3 text-xs text-muted-foreground space-y-1.5 border border-border">
                    <div className="flex justify-between">
                      <span>{language === "bn" ? "আর্কিটেকচার:" : "Architecture:"}</span>
                      <span className="font-medium text-foreground">{model.architecture}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === "bn" ? "কনটেক্সট:" : "Context:"}</span>
                      <span className="font-medium text-foreground">{model.contextLength}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === "bn" ? "ভি-র‍্যাম:" : "VRAM:"}</span>
                      <span className="font-medium text-foreground">{model.vramRequired}</span>
                    </div>
                  </div>

                  <Button
                    variant={isActive ? "primary" : "outline"}
                    className="w-full justify-center text-xs"
                    onClick={() => handleActivateModel(model.id, model.name)}
                  >
                    {isActive ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        {language === "bn" ? "বর্তমানে সক্রিয় মডেল" : "Selected Active Model"}
                      </>
                    ) : (
                      language === "bn" ? "সক্রিয় করুন" : "Set as Active"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fine-Tuned Adapters */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {language === "bn" ? "কাস্টম ফাইন-টিউনড অ্যাডাপ্টার" : "Custom Fine-Tuned Adapters"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {language === "bn"
              ? "আপনার নিজস্ব গল্পের ডেটাসেট থেকে তৈরি করা ট্রেইনড LoRA অ্যাডাপ্টারসমূহ।"
              : "Trained LoRA adapters generated from your personal dataset."}
          </p>
        </div>

        <Card className="bg-surface border-border">
          <CardContent className="p-6">
            {loading ? (
              <div className="flex min-h-32 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Boxes className="h-10 w-10 text-muted-foreground/40" />
                <h4 className="mt-3 text-sm font-semibold text-foreground">
                  {language === "bn" ? "এখনো কোনো কাস্টম অ্যাডাপ্টার নেই" : "No custom adapters yet"}
                </h4>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {language === "bn"
                    ? "আপনার ব্যক্তিগত লেখার ধরন আয়ত্ত করতে ট্রেনিং সেন্টারে একটি LoRA অ্যাডাপ্টার ট্রেইন করুন।"
                    : "Train a LoRA adapter in the Training Center to capture your personal writing style."}
                </p>
                <Link href="/train" className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-4`}>
                  {language === "bn" ? "ট্রেনিং-এ যান" : "Go to Training"}
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {runs.map((r) => {
                  const isAdapterActive = activeModel === r.id;
                  const date = new Date(r.created_at).toLocaleDateString(
                    language === "bn" ? "bn-BD" : "en-US",
                    {
                      month: "short",
                      day: "numeric",
                    }
                  );
                  return (
                    <div
                      key={r.id}
                      className={`flex flex-col gap-3 rounded-xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                        isAdapterActive ? "border-primary bg-primary/5" : "border-border bg-surface"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <HardDrive className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-semibold text-sm text-foreground">
                              Adapter: {r.base_model} (Rank {r.lora_rank})
                            </h5>
                            <Badge variant={r.status === "done" ? "primary" : "neutral"}>
                              {r.status}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Run #{r.id.slice(0, 8)} · {r.epochs} epochs · Trained {date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <Button
                          variant={isAdapterActive ? "primary" : "outline"}
                          size="sm"
                          onClick={() => handleActivateModel(r.id, `${r.base_model} (LoRA r=${r.lora_rank})`)}
                        >
                          {isAdapterActive
                            ? language === "bn"
                              ? "সক্রিয়"
                              : "Active"
                            : language === "bn"
                            ? "সক্রিয় করুন"
                            : "Activate"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
