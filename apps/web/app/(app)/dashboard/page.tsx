"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Library, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { storiesApi, type StoryListItem } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    storiesApi()
      .list(0, 3)
      .then(({ stories, total }) => {
        setStories(stories);
        setTotal(total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalWords = stories.reduce((sum, s) => sum + s.word_count, 0);
  const favoriteGenre = stories.length
    ? [...stories].sort(
        (a, b) =>
          stories.filter((s) => s.genre === b.genre).length -
          stories.filter((s) => s.genre === a.genre).length,
      )[0]?.genre || t("dashboard.none", undefined, "None")
    : t("dashboard.none", undefined, "None");

  const hour = new Date().getHours();
  const greetingText =
    hour < 12
      ? t("dashboard.goodMorning", undefined, "Good morning")
      : hour < 18
      ? t("dashboard.goodAfternoon", undefined, "Good afternoon")
      : t("dashboard.goodEvening", undefined, "Good evening");

  const stats = [
    { label: t("dashboard.statStoriesCreated", undefined, "Stories created"), value: String(total) },
    {
      label: t("dashboard.statWordsGenerated", undefined, "Words generated"),
      value: totalWords > 0 ? totalWords.toLocaleString(language === "bn" ? "bn-BD" : "en-US") : "0",
    },
    { label: t("dashboard.statFavoriteGenre", undefined, "Favorite genre"), value: favoriteGenre },
    { label: t("dashboard.statGenerationCount", undefined, "Generation count"), value: "0" },
  ];

  return (
    <section>
      <PageHeader
        title={`${greetingText}${user?.display_name ? `, ${user.display_name}` : ""}.`}
        description={t("dashboard.readyToCreate", undefined, "Ready to create something new?")}
      >
        <Link href="/train" className={buttonVariants({ variant: "outline", className: "rounded-xl border-border/80 hover:bg-surface-hover" })}>
          <Sparkles className="h-4 w-4 mr-1.5 text-primary" aria-hidden="true" />
          {t("dashboard.trainAiModel", undefined, "Train AI Model")}
        </Link>
        <Link href="/chat" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-radiant px-4 py-2 text-xs font-bold text-white shadow-radiant hover:brightness-110 active:scale-95 transition-all">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          {t("dashboard.aiStoryChat", undefined, "AI Story Chat")}
        </Link>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="rounded-3xl border-border/80 bg-surface/85 backdrop-blur-xl shadow-card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="font-display text-lg font-bold text-foreground">{t("dashboard.recentStories", undefined, "Recent Stories")}</CardTitle>
                <CardDescription>{t("dashboard.recentStoriesDesc", undefined, "Your latest saved work.")}</CardDescription>
              </div>
              <Library className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-44 items-center justify-center">
                <p className="text-sm text-muted-foreground">{t("common.loading", undefined, "Loading…")}</p>
              </div>
            ) : stories.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-surface-hover/30 p-6 text-center">
                <BookOpen className="h-8 w-8 text-primary" aria-hidden="true" />
                <p className="mt-3 font-bold text-foreground">{t("dashboard.noStoriesYet", undefined, "No stories yet")}</p>
                <p className="mt-1 max-w-sm text-xs leading-6 text-muted-foreground">
                  {t("dashboard.noStoriesYetDesc", undefined, "Start with a genre, theme, mood, setting, and a few characters.")}
                </p>
                <Link
                  href="/studio"
                  className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4 rounded-xl border-border/80 hover:bg-surface-hover" })}
                >
                  {t("dashboard.openStudio", undefined, "Open Studio")}
                  <ArrowUpRight className="h-4 w-4 ml-1" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {stories.map((story) => (
                  <li key={story.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface/80 hover:border-primary/40 p-3.5 transition-all group">
                    <div>
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{story.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {story.word_count.toLocaleString(language === "bn" ? "bn-BD" : "en-US")} {t("common.words", undefined, "words")}{story.genre ? ` · ${story.genre}` : ""}
                      </p>
                    </div>
                    <Link
                      href={`/stories/${story.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm", className: "rounded-xl" })}
                    >
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
                {total > 3 && (
                  <li className="pt-1 text-center">
                    <Link href="/stories" className={buttonVariants({ variant: "ghost", size: "sm", className: "rounded-xl text-primary font-semibold" })}>
                      {t("dashboard.viewAllStories", { total: String(total) }, `View all ${total} stories`)}
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border/80 bg-surface/85 backdrop-blur-xl shadow-card-elevated">
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold text-foreground">{t("dashboard.taleforgeModel", undefined, "TaleForge Core")}</CardTitle>
            <CardDescription>{t("dashboard.taleforgeModelDesc", undefined, "Active AI storyteller engine.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
              <div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t("dashboard.ready", undefined, "Ready & Synchronized")}
                </p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">{t("dashboard.frontendOnline", undefined, "AI Memory & Training active")}</p>
              </div>
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-3xl border-border/80 bg-surface/85 backdrop-blur-xl shadow-card-elevated hover:border-primary/40 hover:-translate-y-0.5 transition-all">
            <CardHeader>
              <CardDescription className="text-xs font-semibold text-muted-foreground">{stat.label}</CardDescription>
              <p className="font-display text-3xl font-extrabold text-foreground tracking-tight mt-1">{stat.value}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
