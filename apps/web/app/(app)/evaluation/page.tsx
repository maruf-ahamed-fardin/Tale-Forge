"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { storiesApi, type StoryListItem } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

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

function analyzeText(text: string, isBn: boolean): EvaluationMetrics {
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
      observations: [
        isBn ? "বিশ্লেষণের জন্য কোনো টেক্সট দেওয়া হয়নি।" : "No text provided for analysis."
      ],
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

  // Bangla Unicode Health
  const hasBengali = /[\u0980-\u09FF]/.test(clean);
  const mojibakeIndicators = /[\u00C0-\u00FF]{2,}|Ã¢|Ã |Ã©/.test(clean);
  const banglaUnicodeHealth = mojibakeIndicators ? 45 : hasBengali ? 98 : 92;

  // Pacing Score
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
    observations.push(
      isBn
        ? "উচ্চশব্দভাণ্ডার ও সমৃদ্ধ ভাষার প্রকাশ লক্ষ্য করা গেছে।"
        : "High vocabulary richness with varied word choice across passages."
    );
  } else {
    observations.push(
      isBn
        ? "শব্দের পুনরাবৃত্তি সামান্য বেশি; চমৎকার উপমা বা প্রতিশব্দ ব্যবহারের সুযোগ আছে।"
        : "Moderate repetition; consider using more evocative synonyms."
    );
  }

  if (avgSentenceLength >= 10 && avgSentenceLength <= 18) {
    observations.push(
      isBn
        ? "বাক্যের দৈর্ঘ্য চমৎকার ও নাটকীয় গল্পের জন্য অত্যন্ত মানানসই।"
        : "Balanced sentence cadence suitable for dramatic narrative pacing."
    );
  } else if (avgSentenceLength < 10) {
    observations.push(
      isBn
        ? "ছোট ছোট চটপটে বাক্য, যা রোমাঞ্চকর বা থ্রিলার দৃশ্যের জন্য আদর্শ।"
        : "Punchy, rapid sentences ideal for suspense and thriller scenes."
    );
  } else {
    observations.push(
      isBn
        ? "দীর্ঘ যৌগিক বাক্য যা ভাবগম্ভীর বা ধ্রুপদী বর্ণনার উপযোগী।"
        : "Long, complex compound clauses characteristic of reflective prose."
    );
  }

  if (dialogueRatio > 15) {
    observations.push(
      isBn
        ? `চরিত্রের আকর্ষণীয় ও জীবন্ত সংলাপ বিদ্যমান (~${dialogueRatio}% সংলাপ)।`
        : `Healthy dialogue representation (~${dialogueRatio}% speech ratio).`
    );
  } else {
    observations.push(
      isBn
        ? "সংলাপের চেয়ে বর্ণনামূলক আবহ সৃষ্টিকে বেশি প্রাধান্য দেওয়া হয়েছে।"
        : "Predominantly descriptive narrative exposition with minimal spoken dialogue."
    );
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
  const { language, t } = useLanguage();
  const isBn = language === "bn";
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
          storiesApi()
            .get(data.stories[0].id)
            .then((s) => {
              setManualText(s.content || "");
              setMetrics(analyzeText(s.content || "", isBn));
            });
        }
      })
      .catch(() => {});
  }, [isBn]);

  const handleSelectStory = async (id: string) => {
    setSelectedStoryId(id);
    setAnalyzing(true);
    try {
      const s = await storiesApi().get(id);
      setManualText(s.content || "");
      setMetrics(analyzeText(s.content || "", isBn));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunEvaluation = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setMetrics(analyzeText(manualText, isBn));
      setAnalyzing(false);
    }, 250);
  };

  return (
    <section>
      <PageHeader
        eyebrow={isBn ? "মূল্যায়ন" : "Evaluation"}
        title={isBn ? "সাহিত্যিক মান ও শৈলী মূল্যায়ন" : "Literary & Style Evaluation"}
        description={
          isBn
            ? "পাণ্ডুলিপি ও সৃষ্ট গল্পগুলোর শব্দভাণ্ডারের বৈচিত্র্য, সংলাপের অনুপাত এবং ভাষার শুদ্ধতা পরীক্ষা করুন।"
            : "Benchmark manuscripts and generated stories against stylistic metrics, vocabulary richness, and Bangla Unicode health."
        }
      >
        <Button onClick={handleRunEvaluation} disabled={analyzing}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${analyzing ? "animate-spin" : ""}`} />
          {isBn ? "মূল্যায়ন সম্পন্ন করুন" : "Run Evaluation"}
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Source Text Selector */}
        <div className="space-y-4">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-foreground">
                {isBn ? "পাণ্ডুলিপি নির্বাচন করুন" : "Select Manuscript"}
              </CardTitle>
              <CardDescription>
                {isBn
                  ? "সংরক্ষিত লাইব্রেরি থেকে বেছে নিন অথবা নিচে টেক্সট লিখুন।"
                  : "Choose from your saved library or paste text below."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stories.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isBn ? "সংরক্ষিত গল্পসমূহ" : "Saved Stories"}
                  </label>
                  <select
                    value={selectedStoryId}
                    onChange={(e) => handleSelectStory(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  >
                    {stories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.word_count.toLocaleString(isBn ? "bn-BD" : "en-US")}{" "}
                        {t("common.words", undefined, "words")})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {isBn ? "পাণ্ডুলিপির মূল টেক্সট" : "Manuscript Text"}
                </label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={
                    isBn
                      ? "মূল্যায়ন করার জন্য বাংলা বা ইংরেজি গল্পের অংশ পেস্ট করুন..."
                      : "Paste story excerpt in Bangla or English to evaluate..."
                  }
                  className="mt-2 min-h-[300px] w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground outline-none focus:border-primary font-serif leading-relaxed"
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleRunEvaluation}
                disabled={analyzing || !manualText.trim()}
              >
                {isBn ? "এই লেখার মান পরীক্ষা করুন" : "Evaluate Current Text"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Evaluation Results */}
        <div className="space-y-6">
          {metrics && (
            <>
              {/* Overall Score Banner */}
              <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-surface to-surface">
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-foreground">
                        {isBn ? "শৈলী ও সাহিত্যিক মান স্কোর" : "Stylistic Quality Score"}
                      </h3>
                      <Badge variant="primary">
                        {isBn ? "স্বয়ংক্রিয় নিরীক্ষা" : "Automated Audit"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isBn
                        ? `${metrics.wordCount.toLocaleString("bn-BD")} শব্দ এবং ${metrics.sentenceCount.toLocaleString("bn-BD")} বাক্যাংশের ওপর হিসাবকৃত।`
                        : `Calculated across ${metrics.wordCount.toLocaleString()} words and ${metrics.sentenceCount} clauses.`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-surface px-5 py-3 shadow-xs border border-border text-center">
                      <div className="text-3xl font-extrabold text-primary">
                        {metrics.overallScore}
                      </div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        / 100 Points
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metric Breakdown Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="bg-surface border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {isBn ? "শব্দভাণ্ডারের বৈচিত্র্য (TTR)" : "Lexical Diversity (TTR)"}
                      </CardTitle>
                      <span className="text-sm font-bold text-primary">{metrics.lexicalDiversity}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${metrics.lexicalDiversity}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isBn
                        ? "মোট শব্দের তুলনায় অনন্য মৌলিক শব্দের অনুপাত।"
                        : "Unique vocabulary count compared to total length."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-surface border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {isBn ? "বাক্যের গতি ও দৈর্ঘ্য" : "Sentence Cadence"}
                      </CardTitle>
                      <span className="text-sm font-bold text-warm">
                        {metrics.avgSentenceLength} w/s
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                      <div
                        className="h-full bg-warm rounded-full transition-all"
                        style={{ width: `${Math.min(metrics.avgSentenceLength * 4, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isBn
                        ? "প্রতি বাক্যে গড় শব্দসংখ্যা; আদর্শ বর্ণনামূলক গতি ১০-১৮।"
                        : "Average words per sentence; ideal narrative pacing is 10-18."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-surface border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {isBn ? "সংলাপের ঘনত্ব" : "Dialogue Density"}
                      </CardTitle>
                      <span className="text-sm font-bold text-foreground">{metrics.dialogueRatio}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all"
                        style={{ width: `${metrics.dialogueRatio}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isBn
                        ? "চরিত্রের সরাসরি উক্তি বনাম বর্ণনামূলক পরিবেশ তৈরি।"
                        : "Direct character dialogue vs. narrative world-building."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-surface border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-foreground">
                        {isBn ? "বাংলা ইউনিকোড বিশুদ্ধতা" : "Bangla Unicode Fidelity"}
                      </CardTitle>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {metrics.banglaUnicodeHealth}%
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${metrics.banglaUnicodeHealth}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isBn
                        ? "যুক্তবর্ণের সঠিকতা ও ভুল এনকোডিং-এর অনুপস্থিতি।"
                        : "Absence of mojibake and illegal conjunct encodings."}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Literary Observations Card */}
              <Card className="bg-surface border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {isBn ? "সাহিত্যিক পর্যবেক্ষণ ও পরামর্শ" : "Stylistic Observations & Insights"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-foreground/90">
                    {metrics.observations.map((obs, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
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
