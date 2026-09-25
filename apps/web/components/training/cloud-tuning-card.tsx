"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Cloud, Loader2, Play, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAccountId } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface TuningJobInfo {
  state: string;
  base_model: string;
  created_at: string;
  updated_at: string;
  story_count: number;
  word_count: number;
  sample_count: number;
  error?: string;
}

interface TuningStatus {
  configured: boolean;
  current_job?: TuningJobInfo;
  active_endpoint?: string;
  active_since?: string;
  detail?: string;
}

const ACTIVE_STATES = ["JOB_STATE_QUEUED", "JOB_STATE_PENDING", "JOB_STATE_RUNNING", "JOB_STATE_UPDATING", "JOB_STATE_CANCELLING"];
const KEY_STORAGE = "tf_tuning_access_key";
const POLL_MS = 60_000;

function stateLabel(state: string, isBn: boolean): string {
  const labels: Record<string, [string, string]> = {
    JOB_STATE_QUEUED: ["অপেক্ষমান", "Queued"],
    JOB_STATE_PENDING: ["শুরু হচ্ছে", "Starting"],
    JOB_STATE_RUNNING: ["ট্রেনিং চলছে", "Training"],
    JOB_STATE_UPDATING: ["আপডেট হচ্ছে", "Updating"],
    JOB_STATE_SUCCEEDED: ["সম্পন্ন", "Completed"],
    JOB_STATE_FAILED: ["ব্যর্থ", "Failed"],
    JOB_STATE_CANCELLING: ["বাতিল হচ্ছে", "Cancelling"],
    JOB_STATE_CANCELLED: ["বাতিল", "Cancelled"],
  };
  const pair = labels[state];
  return pair ? pair[isBn ? 0 : 1] : state;
}

export function CloudTuningCard() {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const [status, setStatus] = useState<TuningStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [accessKey, setAccessKey] = useState("");

  useEffect(() => {
    try {
      setAccessKey(localStorage.getItem(KEY_STORAGE) || "");
    } catch {
      // storage unavailable
    }
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ai/tuning", { headers: { "x-account-id": getAccountId() } });
      const data: TuningStatus = await res.json();
      if (res.status === 503 && data.configured === false) {
        setStatus(data);
      } else if (!res.ok) {
        setError(data.detail || "Could not load training status");
      } else {
        setStatus(data);
        setError("");
      }
    } catch {
      setError(isBn ? "ট্রেনিং স্ট্যাটাস লোড করা যায়নি।" : "Could not load training status.");
    } finally {
      setLoading(false);
    }
  }, [isBn]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const job = status?.current_job;
  const isActive = !!job && ACTIVE_STATES.includes(job.state);

  // Training takes a while; refresh once a minute while a job is running
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(loadStatus, POLL_MS);
    return () => clearInterval(id);
  }, [isActive, loadStatus]);

  const handleStart = async () => {
    const confirmed = window.confirm(
      isBn
        ? "Google Cloud-এ আপনার গল্প দিয়ে Gemini ট্রেনিং শুরু হবে। এতে আপনার Google Cloud অ্যাকাউন্টে খরচ হবে। চালিয়ে যাবেন?"
        : "This starts Gemini training on your stories in Google Cloud and will be billed to your Google Cloud account. Continue?",
    );
    if (!confirmed) return;

    setStarting(true);
    setError("");
    try {
      try {
        localStorage.setItem(KEY_STORAGE, accessKey.trim());
      } catch {
        // storage unavailable
      }
      const res = await fetch("/api/v1/ai/tuning", {
        method: "POST",
        headers: { "x-account-id": getAccountId(), "x-tuning-key": accessKey.trim() },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Could not start training");
        return;
      }
      setStatus(data);
    } catch {
      setError(isBn ? "ট্রেনিং শুরু করা যায়নি।" : "Could not start training.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card className="mb-6 border-primary/40">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base text-primary flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              {isBn ? "ক্লাউডে ট্রেইন করুন (Gemini, Google Vertex AI)" : "Train in the Cloud (Gemini on Google Vertex AI)"}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {isBn
                ? "কোনো GPU লাগবে না। আপনার নিজের লেখা গল্প দিয়ে Gemini ফাইন-টিউন হবে, তারপর চ্যাটে \"TaleForge LoRA\" বেছে নিলে সেই মডেল লিখবে।"
                : "No GPU needed. Gemini is fine-tuned on your own stories; pick \"TaleForge LoRA\" in chat to write with it."}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            {isBn ? "রিফ্রেশ" : "Refresh"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        {status?.configured === false && (
          <p className="rounded-lg border border-border bg-surface p-3 text-muted-foreground">
            {isBn
              ? "এই সার্ভারে ক্লাউড ট্রেনিং চালু করা হয়নি। .env-এ GOOGLE_CLOUD_PROJECT, GCS_BUCKET, GOOGLE_SERVICE_ACCOUNT_JSON ও TUNING_ACCESS_KEY সেট করুন।"
              : "Cloud training isn't set up on this server. Set GOOGLE_CLOUD_PROJECT, GCS_BUCKET, GOOGLE_SERVICE_ACCOUNT_JSON and TUNING_ACCESS_KEY in .env."}
          </p>
        )}

        {status?.active_endpoint && (
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {isBn
              ? "আপনার ট্রেইন করা মডেল প্রস্তুত। চ্যাটে \"TaleForge LoRA\" বেছে নিন।"
              : "Your trained model is ready. Pick \"TaleForge LoRA\" in chat."}
          </div>
        )}

        {job && (
          <div className="rounded-lg border border-border bg-surface p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{isBn ? "সর্বশেষ ট্রেনিং" : "Latest training"}</span>
              <Badge variant={isActive ? "warm" : job.state === "JOB_STATE_SUCCEEDED" ? "primary" : "neutral"}>
                {isActive && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {stateLabel(job.state, isBn)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {job.base_model} · {job.story_count} {isBn ? "গল্প" : "stories"} · {job.word_count} {isBn ? "শব্দ" : "words"} ·{" "}
              {job.sample_count} {isBn ? "ট্রেনিং উদাহরণ" : "training examples"}
            </p>
            <p className="text-muted-foreground">
              {isBn ? "শুরু" : "Started"}: {new Date(job.created_at).toLocaleString()}
              {isActive && (isBn ? " · সাধারণত ৩০–৯০ মিনিট লাগে" : " · usually takes 30–90 minutes")}
            </p>
            {job.error && <p className="text-red-700 dark:text-red-300">{job.error}</p>}
          </div>
        )}

        {status?.configured && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="password"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder={isBn ? "ট্রেনিং অ্যাক্সেস কী (TUNING_ACCESS_KEY)" : "Training access key (TUNING_ACCESS_KEY)"}
              className="sm:max-w-xs"
              autoComplete="off"
            />
            <Button onClick={handleStart} disabled={starting || isActive || !accessKey.trim()}>
              {starting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
              {status.active_endpoint
                ? isBn ? "নতুন গল্প দিয়ে আবার ট্রেইন করুন" : "Retrain with my latest stories"
                : isBn ? "ট্রেনিং শুরু করুন" : "Start training"}
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
