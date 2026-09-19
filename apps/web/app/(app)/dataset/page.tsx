"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileCheck,
  FileText,
  Layers,
  RefreshCw,
  Search,
  UploadCloud,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { datasetsApi, type DatasetOut } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

const statusVariants: Record<string, "neutral" | "primary" | "warm"> = {
  raw: "neutral",
  extracted: "warm",
  validated: "primary",
  training_ready: "primary",
};

export default function DatasetPage() {
  const { t, language } = useLanguage();
  const [datasets, setDatasets] = useState<DatasetOut[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await datasetsApi().list();
      setDatasets(data.datasets);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  const handleUploadFile = async (file: File) => {
    const validExtensions = [".docx", ".pdf", ".txt"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError(
        language === "bn"
          ? `ফাইল ফরম্যাট '${ext}' সমর্থিত নয়। শুধু DOCX, PDF, ও TXT ব্যবহার করুন।`
          : `Invalid file format '${ext}'. Only DOCX, PDF, and TXT are supported.`
      );
      return;
    }

    setUploading(true);
    setError("");
    setUploadSuccess("");

    try {
      const newDataset = await datasetsApi().upload(file);
      setUploadSuccess(
        language === "bn"
          ? `"${newDataset.original_name}" সফলভাবে আপলোড হয়েছে!`
          : `Successfully uploaded "${newDataset.original_name}"!`
      );
      await loadDatasets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadSuccess(""), 4000);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const totalWords = datasets.reduce((sum, d) => sum + (d.word_count || 0), 0);
  const filtered = datasets.filter((d) =>
    d.original_name.toLowerCase().includes(search.toLowerCase()) ||
    d.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section>
      <PageHeader
        eyebrow={language === "bn" ? "ডেটাসেট" : "Dataset"}
        title={language === "bn" ? "ট্রেনিং ডেটা ও গল্পভাণ্ডার" : "Training Data & Stories"}
        description={
          language === "bn"
            ? "ব্যক্তিগত বাংলা গল্পের পাণ্ডুলিপি, উপন্যাসের অংশ ও নথি আপলোড ও পরিচালনা করুন।"
            : "Upload and manage private Bangla story manuscripts, novel excerpts, and documents for style fine-tuning."
        }
      >
        <Button
          variant="outline"
          onClick={() => loadDatasets()}
          disabled={loading}
          aria-label="Refresh datasets"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          {t("common.refresh", undefined, "Refresh")}
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === "bn" ? "সোর্স ফাইলসমূহ" : "Source Files"}
            </CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === "bn" ? "আপলোডকৃত পাণ্ডুলিপি ও নথি" : "Uploaded manuscripts & docs"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === "bn" ? "মোট শব্দসংখ্যা" : "Total Words"}
            </CardTitle>
            <FileText className="h-4 w-4 text-warm" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalWords.toLocaleString(language === "bn" ? "bn-BD" : "en-US")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {language === "bn" ? "সংগৃহীত শব্দ ও টোকেন" : "Extracted vocabulary tokens"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {language === "bn" ? "পাইপলাইন অবস্থা" : "Pipeline Stage"}
            </CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {datasets.filter((d) => d.status === "training_ready").length}{" "}
              {language === "bn" ? "প্রস্তুত" : "Ready"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {datasets.filter((d) => d.status === "raw").length}{" "}
              {language === "bn" ? "যাচাইয়ের অপেক্ষমান" : "raw pending validation"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone */}
      <Card className="mb-6 bg-surface border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            {language === "bn" ? "গল্পের নথি আপলোড করুন" : "Upload Story Documents"}
          </CardTitle>
          <CardDescription>
            {language === "bn"
              ? "সমর্থিত ফরম্যাট: DOCX, PDF, এবং UTF-8 TXT ফাইল (সর্বোচ্চ ২৫ মেগাবাইট)।"
              : "Supported formats: DOCX, PDF, and UTF-8 TXT files up to 25 MB."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              dragActive
                ? "border-primary bg-primary/10"
                : "border-border bg-surface-hover/40 hover:bg-surface-hover/70"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,.txt"
              className="hidden"
              onChange={onFileInputChange}
              id="dataset-file-input"
            />
            <div className="rounded-full bg-surface p-3 shadow-xs ring-1 ring-border">
              <UploadCloud className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              {language === "bn"
                ? "পাণ্ডুলিপি এখানে টেনে আনুন অথবা ব্রাউজ করুন"
                : "Drag & drop manuscripts or browse files"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {language === "bn"
                ? "আপনার মূল নথিগুলো সম্পূর্ণ ব্যক্তিগত ও সুরক্ষিত থাকে।"
                : "Your source documents remain private and are kept intact in cold storage."}
            </p>
            <Button
              className="mt-4"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading
                ? language === "bn"
                  ? "আপলোড ও প্রসেসিং হচ্ছে…"
                  : "Uploading & Processing…"
                : language === "bn"
                ? "ডকুমেন্ট নির্বাচন করুন"
                : "Select Document"}
            </Button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dataset List */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={
              language === "bn"
                ? "ফাইলের নাম বা স্ট্যাটাস দিয়ে খুঁজুন…"
                : "Search datasets by filename or status…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-surface border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-4 text-base font-semibold text-foreground">
              {search
                ? language === "bn"
                  ? "কোনো মিল পাওয়া যায়নি"
                  : "No matching documents found"
                : language === "bn"
                ? "এখনো কোনো ডেটাসেট নেই"
                : "No dataset documents yet"}
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {search
                ? language === "bn"
                  ? `"${search}" এর সাথে কোনো ফাইল মেলেনি।`
                  : `No files matched "${search}". Try searching with a different term.`
                : language === "bn"
                ? "আপনার নিজস্ব লেখার স্টাইলে এআই ট্রেইন করতে গল্প বা বইয়ের ফাইল আপলোড করুন।"
                : "Upload your existing Bangla stories, drafts, or books to prepare your customized training dataset."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => {
            const date = new Date(item.created_at).toLocaleDateString(
              language === "bn" ? "bn-BD" : "en-US",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              }
            );
            return (
              <Card key={item.id} className="bg-surface border-border transition hover:border-primary/40">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{item.original_name}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {item.word_count.toLocaleString(language === "bn" ? "bn-BD" : "en-US")}{" "}
                          {t("common.words", undefined, "words")}
                        </span>
                        <span>•</span>
                        <span>
                          {language === "bn" ? "আপলোডের তারিখ:" : "Uploaded on"} {date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <Badge variant={statusVariants[item.status] ?? "neutral"}>
                      {item.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
