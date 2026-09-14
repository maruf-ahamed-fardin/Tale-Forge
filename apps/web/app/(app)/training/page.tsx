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
  { id: "bangla-llama-7b", name: "Bangla LLaMA 7B", desc: "Optimized for Bangla storytelling & literature" },
  { id: "mistral-7b-bangla", name: "Mistral 7B Bangla", desc: "High reasoning speed & vocabulary diversity" },
  { id: "qwen2.5-7b-instruct", name: "Qwen 2.5 7B Multi", desc: "Balanced multi-lingual narrative generation" },
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

  // Form state
  const [selectedModel, setSelectedModel] = useState("bangla-llama-7b");
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

  const queuedOrRunning = runs.filter((r) => r.status === "queued" || r.status === "running").length;
  const completedRuns = runs.filter((r) => r.status === "done").length;

  return (
    <section>
      <PageHeader
        eyebrow="Training"
        title="LoRA Fine-Tuning Center"
        description="Adapt open-source base models to your personal Bangla storytelling style using Low-Rank Adaptation (LoRA/QLoRA)."
      >
        <Button variant="outline" onClick={() => loadData()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </Button>
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
          </CardContent>
        </Card>
      </div>

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
