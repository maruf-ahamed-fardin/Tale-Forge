"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Layers,
  Play,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { datasetsApi, trainingApi, type DatasetOut, type TrainingRunOut } from "@/lib/api";

const baseModels = [
  { id: "qwen2.5-1.5b-instruct", name: "Qwen 2.5 1.5B (Local GPU 4GB VRAM)", desc: "Lightweight, fits in GTX 1650, excellent Bangla literature" },
  { id: "gemma-2-2b-it", name: "Google Gemma 2 2B", desc: "Fast and coherent creative structure" },
  { id: "qwen2.5-7b-instruct", name: "Qwen 2.5 7B Multi (Colab T4 15GB)", desc: "Highest literary quality & deep vocabulary" },
  { id: "bangla-llama-7b", name: "Bangla LLaMA 7B", desc: "Optimized for Bangla storytelling & literature" },
];

const rankOptions = [8, 16, 32, 64];
const epochOptions = [1, 3, 5, 10];

const statusVariants: Record<string, "neutral" | "primary" | "warm"> = {
  queued: "warm",
  running: "primary",
  done: "primary",
  failed: "neutral",
};

export default function TrainingPage() {
  const [runs, setRuns] = useState<TrainingRunOut[]>([]);
  const [datasets, setDatasets] = useState<DatasetOut[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Form state
  const [selectedModel, setSelectedModel] = useState("qwen2.5-1.5b-instruct");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [loraRank, setLoraRank] = useState(16);
  const [epochs, setEpochs] = useState(3);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [runsData, datasetsData] = await Promise.all([
        trainingApi().list(),
        datasetsApi().list(),
      ]);
      setRuns(runsData.runs);
      setTotal(runsData.total);
      setDatasets(datasetsData.datasets);
      if (datasetsData.datasets.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(datasetsData.datasets[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load training data");
    } finally {
      setLoading(false);
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLaunchRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaunching(true);
    setError("");
    setSuccessMsg("");

    try {
      const newRun = await trainingApi().start({
        base_model: selectedModel,
        dataset_id: selectedDatasetId || null,
        lora_rank: loraRank,
        epochs,
      });
      setSuccessMsg(`Training run #${newRun.id.slice(0, 8)} queued successfully!`);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start training run");
    } finally {
      setLaunching(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  const handleExportDataset = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await fetch("/api/v1/ai/export-dataset", { method: "POST" });
      const data = await res.json();
      setSuccessMsg(data.message || "Dataset exported to data/datasets/train.jsonl!");
    } catch {
      setError("Failed to export dataset.");
    } finally {
      setExporting(false);
      setTimeout(() => setSuccessMsg(""), 6000);
    }
  };

  const queuedOrRunning = runs.filter((r) => r.status === "queued" || r.status === "running").length;
  const completedRuns = runs.filter((r) => r.status === "done").length;

  return (
    <section>
      <PageHeader
        eyebrow="Training"
        title="LoRA Fine-Tuning Center"
        description="Adapt open-source base models to your personal Bangla storytelling style using Low-Rank Adaptation (LoRA/QLoRA)."
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportDataset}
            disabled={exporting}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            <Database className="h-4 w-4 mr-1.5" />
            {exporting ? "Exporting..." : "Export Stories to ML Dataset (.jsonl)"}
          </Button>
          <Button variant="outline" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Overview Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">Total training experiments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active / Queued</CardTitle>
            <Activity className="h-4 w-4 text-warm" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queuedOrRunning}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending background execution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Adapters</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedRuns}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for story generation</p>
        </Card>
      </div>

      {/* True ML Training Hub Banner */}
      <Card className="mb-6 border-primary/40 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/40">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base text-primary flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                আপনার নিজস্ব ML মডেল ট্রেইন করুন (True Local & Colab Training)
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                কোনো ক্লাউড এপিআই নয়—আপনার দেওয়া বাংলা গল্পগুলো দিয়ে সম্পূর্ণ ওপেন-সোর্স নিউরাল মডেল ফাইন-টিউন করুন।
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded px-2.5 py-1">
                GTX 1650 4GB Supported
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-white p-3 space-y-2 shadow-xs">
              <div className="font-semibold text-[#1f1b2d] flex items-center gap-1.5">
                <Server className="h-4 w-4 text-primary" />
                পদ্ধতি ১: আপনার নিজের পিসিতে ট্রেইন করুন (Local LoRA)
              </div>
              <p className="text-muted-foreground leading-relaxed">
                টার্মিনালে নিচের কমান্ডটি চালালেই আপনার গল্পগুলোর ওপর <code>Qwen2.5-1.5B</code> মডেল ট্রেইন হবে:
              </p>
              <div className="relative rounded bg-slate-900 text-slate-100 p-2.5 font-mono text-[11px] break-all">
                python ai/training/train_lora.py --base_model Qwen/Qwen2.5-1.5B-Instruct
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText("python ai/training/train_lora.py --base_model Qwen/Qwen2.5-1.5B-Instruct");
                    setCopiedCmd(true);
                    setTimeout(() => setCopiedCmd(false), 2500);
                  }}
                  className="absolute right-2 top-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:text-white"
                >
                  {copiedCmd ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-white p-3 space-y-2 shadow-xs">
              <div className="font-semibold text-[#1f1b2d] flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" />
                পদ্ধতি ২: Google Colab-এ ১-ক্লিকে ফ্রি 15GB GPU ট্রেইনিং
              </div>
              <p className="text-muted-foreground leading-relaxed">
                বড় 7B মডেল দ্রুত ট্রেইন করতে আমাদের তৈরি Colab নোটবুকটি চালান:
              </p>
              <div className="pt-1">
                <a
                  href="https://colab.research.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-700 hover:bg-amber-500/20 transition"
                >
                  <Play className="h-3.5 w-3.5" />
                  Open notebooks/TaleForge_Training_Colab.ipynb in Colab &rarr;
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Launch New Run Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Launch New Training</CardTitle>
            <CardDescription>
              Configure adapter hyperparameters and dataset pairing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLaunchRun} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Base Model
                </label>
                <div className="mt-2 space-y-2">
                  {baseModels.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      className={`cursor-pointer rounded-lg border p-3 transition ${
                        selectedModel === m.id
                          ? "border-primary bg-indigo-50/50"
                          : "border-border hover:bg-[#faf8f5]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#292524]">{m.name}</span>
                        {selectedModel === m.id && <Zap className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Target Dataset
                </label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-[#292524] outline-none focus:border-primary"
                >
                  {datasets.length === 0 ? (
                    <option value="">No uploaded datasets found (uses default)</option>
                  ) : (
                    datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.original_name} ({d.word_count.toLocaleString()} words)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  LoRA Rank (r)
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {rankOptions.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setLoraRank(r)}
                      className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold transition ${
                        loraRank === r
                          ? "border-primary bg-indigo-50 text-primary"
                          : "border-border bg-white text-[#44403c] hover:bg-[#f7f4ef]"
                      }`}
                    >
                      r = {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Epochs
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {epochOptions.map((e) => (
                    <button
                      type="button"
                      key={e}
                      onClick={() => setEpochs(e)}
                      className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold transition ${
                        epochs === e
                          ? "border-primary bg-indigo-50 text-primary"
                          : "border-border bg-white text-[#44403c] hover:bg-[#f7f4ef]"
                      }`}
                    >
                      {e} {e === 1 ? "epoch" : "epochs"}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <Button className="w-full mt-2" disabled={launching} type="submit" id="start-training-btn">
                <Play className="h-4 w-4 mr-1.5" />
                {launching ? "Starting Training Run…" : "Start Training Run"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Training Runs History */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training History & Experiments</CardTitle>
              <CardDescription>
                Track adapter convergence, status, and configuration details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex min-h-48 items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Cpu className="h-10 w-10 text-muted-foreground/40" />
                  <h3 className="mt-4 text-base font-semibold text-[#292524]">
                    No training runs yet
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Launch your first LoRA fine-tuning run using the configuration panel on the left.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {runs.map((r) => {
                    const date = new Date(r.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col gap-2 rounded-xl border border-border p-4 transition hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-indigo-50 p-2.5 text-primary">
                            <Server className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-[#292524] text-sm">
                                {r.base_model}
                              </h4>
                              <span className="font-mono text-xs text-muted-foreground">
                                #{r.id.slice(0, 8)}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>LoRA r={r.lora_rank}</span>
                              <span>•</span>
                              <span>{r.epochs} epochs</span>
                              <span>•</span>
                              <span>Started {date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <Badge variant={statusVariants[r.status] ?? "neutral"}>
                            {r.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
