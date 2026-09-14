"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Check,
  CheckCircle2,
  Cpu,
  Download,
  HardDrive,
  Layers,
  Play,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trainingApi, type TrainingRunOut } from "@/lib/api";

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
    setActiveMsg(`Activated "${modelName}" for Story Studio!`);
    setTimeout(() => setActiveMsg(""), 3500);
  };

  return (
    <section>
      <PageHeader
        eyebrow="Models"
        title="Model & Adapter Registry"
        description="Manage foundation models and choose which fine-tuned LoRA adapter powers your story generation."
      >
        <Link href="/training" className={buttonVariants({ variant: "outline" })}>
          <Zap className="h-4 w-4 mr-1.5" />
          Train New Adapter
        </Link>
      </PageHeader>

      {/* Active Model Notification */}
      {activeMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{activeMsg}</span>
        </div>
      )}

      {/* Currently Active Banner */}
      <Card className="mb-8 border-primary/40 bg-gradient-to-r from-indigo-50/60 to-surface">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary p-3 text-white shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#292524]">
                  Active Engine: {baseModels.find((m) => m.id === activeModel)?.name || activeModel}
                </h3>
                <Badge variant="primary">Active in Studio</Badge>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                All generation requests from the Story Studio will automatically use this model configuration.
              </p>
            </div>
          </div>
          <Link href="/studio" className={buttonVariants()}>
            Open Studio
          </Link>
        </CardContent>
      </Card>

      {/* Base Models Grid */}
      <div className="mb-8 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#292524]">Base Foundation Models</h3>
          <p className="text-xs text-muted-foreground">
            Standard open-weights models supported for fine-tuning and local inference.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {baseModels.map((model) => {
            const isActive = activeModel === model.id;
            return (
              <Card
                key={model.id}
                className={`flex flex-col justify-between transition-all ${
                  isActive ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{model.name}</CardTitle>
                    <Badge variant={model.status === "Recommended" ? "primary" : "neutral"}>
                      {model.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1 text-xs">{model.desc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-[#faf8f5] p-3 text-xs text-muted-foreground space-y-1.5 border border-border">
                    <div className="flex justify-between">
                      <span>Architecture:</span>
                      <span className="font-medium text-[#292524]">{model.architecture}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Context:</span>
                      <span className="font-medium text-[#292524]">{model.contextLength}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VRAM:</span>
                      <span className="font-medium text-[#292524]">{model.vramRequired}</span>
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
                        Selected Active Model
                      </>
                    ) : (
                      "Set as Active"
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
          <h3 className="text-base font-bold text-[#292524]">Custom Fine-Tuned Adapters</h3>
          <p className="text-xs text-muted-foreground">
            Trained LoRA adapters generated from your personal dataset.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex min-h-32 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Boxes className="h-10 w-10 text-muted-foreground/40" />
                <h4 className="mt-3 text-sm font-semibold text-[#292524]">No custom adapters yet</h4>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  Train a LoRA adapter in the Training Center to capture your personal writing style.
                </p>
                <Link href="/training" className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-4`}>
                  Go to Training
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {runs.map((r) => {
                  const isAdapterActive = activeModel === r.id;
                  const date = new Date(r.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={r.id}
                      className={`flex flex-col gap-3 rounded-xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                        isAdapterActive ? "border-primary bg-indigo-50/20" : "border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-indigo-50 p-2 text-primary">
                          <HardDrive className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold text-sm text-[#292524]">
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

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          variant={isAdapterActive ? "primary" : "outline"}
                          size="sm"
                          onClick={() => handleActivateModel(r.id, `${r.base_model} (LoRA r=${r.lora_rank})`)}
                        >
                          {isAdapterActive ? "Active" : "Activate"}
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
