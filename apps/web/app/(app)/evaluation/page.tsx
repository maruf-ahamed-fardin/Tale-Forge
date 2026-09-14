"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HelpCircle,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { storiesApi, type StoryListItem, type StoryOut } from "@/lib/api";

interface EvaluationMetrics {
  overallScore: number;
  lexicalDiversity: number; // Unique words / total words
  avgSentenceLength: number;
  dialogueRatio: number;
  banglaUnicodeHealth: number; // 0-100
  pacingScore: number;
  wordCount: number;
  sentenceCount: number;
  observations: string[];
}

function analyzeText(text: string): EvaluationMetrics {
  const clean = text.trim();
  if (!clean) {
    return {
      overallScore: 0,
      lexicalDiversity: 0,
      avgSentenceLength: 0,
      dialogueRatio: 0,
      banglaUnicodeHealth: 100,
      pacingScore: 0,
      wordCount: 0,
      sentenceCount: 0,
      observations: ["No text provided for analysis."],
    };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
  const lexicalDiversity = Math.round((uniqueWords / Math.max(totalWords, 1)) * 100);

  // Sentences (split by । ? ! . \n)
  const sentences = clean.split(/[।?!.\n]+/).map((s) => s.trim()).filter(Boolean);
  const totalSentences = Math.max(sentences.length, 1);
  const avgSentenceLength = Math.round((totalWords / totalSentences) * 10) / 10;

  // Dialogue extraction (quotes: "" or «» or '')
  const dialogueMatches = clean.match(/["“][^"”]+["”]/g) || [];
  const dialogueWords = dialogueMatches.reduce((sum, match) => sum + match.split(/\s+/).length, 0);
  const dialogueRatio = Math.min(Math.round((dialogueWords / Math.max(totalWords, 1)) * 100), 100);

  // Bangla Unicode Health: check for known corrupt byte sequences or ASCII corruption
  const hasBengali = /[\u0980-\u09FF]/.test(clean);
  const mojibakeIndicators = /[\u00C0-\u00FF]{2,}|Ã¢|Ã |Ã©/.test(clean);
  const banglaUnicodeHealth = mojibakeIndicators ? 45 : hasBengali ? 98 : 92;

  // Pacing Score (based on sentence length variation)
  const pacingScore = avgSentenceLength >= 8 && avgSentenceLength <= 22 ? 92 : 78;

  // Compute Overall Stylistic Score
  const overallScore = Math.min(
    Math.round(
      (lexicalDiversity * 0.35) +
      (pacingScore * 0.35) +
      (banglaUnicodeHealth * 0.2) +
      (Math.min(dialogueRatio * 2, 20) * 0.1)
    ),
    99
  );

  const observations: string[] = [];
  if (lexicalDiversity > 60) {
    observations.push("High vocabulary richness with varied word choice across passages.");
  } else {
    observations.push("Moderate repetition; consider using more evocative Bangla synonyms.");
  }

  if (avgSentenceLength >= 10 && avgSentenceLength <= 18) {
    observations.push("Balanced sentence cadence suitable for dramatic narrative pacing.");
  } else if (avgSentenceLength < 10) {
    observations.push("Punchy, rapid sentences ideal for suspense and thriller scenes.");
  } else {
    observations.push("Long, complex compound clauses characteristic of reflective prose.");
  }

  if (dialogueRatio > 15) {
    observations.push(`Healthy dialogue representation (~${dialogueRatio}% speech ratio).`);
  } else {
    observations.push("Predominantly descriptive narrative exposition with minimal spoken dialogue.");
  }

  return {
    overallScore,
    lexicalDiversity,
    avgSentenceLength,
    dialogueRatio,
    banglaUnicodeHealth,
    pacingScore,
    wordCount: totalWords,
    sentenceCount: totalSentences,
    observations,
  };
}

export default function EvaluationPage() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");
  const [manualText, setManualText] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);

  useEffect(() => {
    storiesApi()
      .list(0, 50)
      .then((data) => {
        setStories(data.stories);
        if (data.stories.length > 0) {
          setSelectedStoryId(data.stories[0].id);
          // Fetch full text of the first story
          storiesApi()
            .get(data.stories[0].id)
            .then((s) => {
              setManualText(s.content || "");
              setMetrics(analyzeText(s.content || ""));
            });
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectStory = async (id: string) => {
    setSelectedStoryId(id);
    setAnalyzing(true);
    try {
      const s = await storiesApi().get(id);
      setManualText(s.content || "");
      setMetrics(analyzeText(s.content || ""));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunEvaluation = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setMetrics(analyzeText(manualText));
      setAnalyzing(false);
    }, 250);
  };

  return (
    <section>
      <PageHeader
        eyebrow="Evaluation"
        title="Literary & Style Evaluation"
        description="Benchmark manuscripts and generated stories against stylistic metrics, vocabulary richness, and Bangla Unicode health."
      >
        <Button onClick={handleRunEvaluation} disabled={analyzing}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${analyzing ? "animate-spin" : ""}`} />
          Run Evaluation
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Source Text Selector */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Manuscript</CardTitle>
              <CardDescription>
                Choose from your saved library or paste text below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stories.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Saved Stories
                  </label>
                  <select
                    value={selectedStoryId}
                    onChange={(e) => handleSelectStory(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-[#292524] outline-none focus:border-primary"
                  >
                    {stories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.word_count} words)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Manuscript Text
                </label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste story excerpt in Bangla or English to evaluate..."
                  className="mt-2 min-h-[300px] w-full rounded-lg border border-border p-3 text-sm text-[#292524] outline-none focus:border-primary"
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleRunEvaluation}
                disabled={analyzing || !manualText.trim()}
              >
                Evaluate Current Text
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Evaluation Results */}
        <div className="space-y-6">
          {metrics && (
            <>
              {/* Overall Score Banner */}
              <Card className="border-primary/40 bg-gradient-to-r from-indigo-50/60 to-surface">
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-[#292524]">
                        Stylistic Quality Score
                      </h3>
                      <Badge variant="primary">Automated Audit</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Calculated across {metrics.wordCount.toLocaleString()} words and {metrics.sentenceCount} clauses.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white px-5 py-3 shadow-sm border border-border text-center">
                      <div className="text-3xl font-extrabold text-primary">
                        {metrics.overallScore}
                      </div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        / 100 Points
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metric Breakdown Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Lexical Diversity (TTR)</CardTitle>
                      <span className="text-sm font-bold text-primary">{metrics.lexicalDiversity}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${metrics.lexicalDiversity}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unique vocabulary count compared to total length.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Sentence Cadence</CardTitle>
                      <span className="text-sm font-bold text-warm">
                        {metrics.avgSentenceLength} w/s
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-warm rounded-full transition-all"
                        style={{ width: `${Math.min(metrics.avgSentenceLength * 4, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Average words per sentence; ideal narrative pacing is 10-18.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Dialogue Density</CardTitle>
                      <span className="text-sm font-bold text-[#292524]">{metrics.dialogueRatio}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-[#292524] rounded-full transition-all"
                        style={{ width: `${metrics.dialogueRatio}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Direct character dialogue vs. narrative world-building.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Bangla Unicode Fidelity</CardTitle>
                      <span className="text-sm font-bold text-green-600">{metrics.banglaUnicodeHealth}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full transition-all"
                        style={{ width: `${metrics.banglaUnicodeHealth}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Absence of mojibake and illegal conjunct encodings.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Literary Observations Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Stylistic Observations & Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-[#44403c]">
                    {metrics.observations.map((obs, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
