"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  Download,
  FilePlus,
  PenTool,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Wand2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { generateApi, storiesApi } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const genres = ["Romance", "Horror", "Thriller", "Mystery", "Fantasy", "Drama"];
const moods = ["Dark", "Emotional", "Mysterious", "Romantic", "Hopeful", "Melancholic"];
const lengths = ["Short", "Medium", "Long", "Custom"];

function StudioContent() {
  const { t, language: globalLanguage } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const storyIdFromUrl = searchParams.get("id");
  const actionFromUrl = searchParams.get("action");

  const [mobileTab, setMobileTab] = useState<"settings" | "editor">("editor");
  const [editingId, setEditingId] = useState<string | null>(storyIdFromUrl);
  const [title, setTitle] = useState("Untitled Story");
  const [content, setContent] = useState("");
  const [genre, setGenre] = useState("Drama");
  const [mood, setMood] = useState("Emotional");
  const [setting, setSetting] = useState("");
  const [lengthPreset, setLengthPreset] = useState("Medium");
  const [language, setLanguage] = useState(globalLanguage || "bn");
  const [characterName, setCharacterName] = useState("");
  const [characterRole, setCharacterRole] = useState("");
  const [characterTraits, setCharacterTraits] = useState("");
  const [loadingStory, setLoadingStory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const handleGenerate = async () => {
    setGenerating(true);
    setSaveMsg("");
    setMobileTab("editor");
    try {
      const res = await generateApi().generate({
        title,
        genre,
        mood,
        setting,
        character_name: characterName,
        character_role: characterRole,
        character_traits: characterTraits,
        length_preset: lengthPreset,
        language,
      });
      const fullText = res.text || "";
      const initialPrefix = content.trim() ? `${content.trim()}\n\n` : "";
      const tokens = fullText.split(/(\s+)/);
      let current = initialPrefix;

      for (let i = 0; i < tokens.length; i++) {
        current += tokens[i];
        setContent(current);
        const token = tokens[i];
        let delay = 14;
        if (token.includes("।") || token.includes(".") || token.includes("!")) {
          delay = 50;
        } else if (token.includes("\n")) {
          delay = 70;
        }
        await new Promise((r) => setTimeout(r, delay));
      }

      setSaveMsg(`Generated ${res.word_count} words!`);
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const paraCount = content.split(/\n\n+/).filter(Boolean).length;

  useEffect(() => {
    if (!storyIdFromUrl) {
      setEditingId(null);
      return;
    }
    setLoadingStory(true);
    storiesApi()
      .get(storyIdFromUrl)
      .then((story) => {
        setEditingId(story.id);
        setTitle(story.title || "Untitled Story");
        setContent(story.content || "");
        setGenre(story.genre || "");
        setMood(story.mood || "");
        setSetting(story.setting || "");
        setLengthPreset(story.length_preset || "Medium");
      })
      .catch(() => {
        setEditingId(null);
      })
      .finally(() => setLoadingStory(false));
  }, [storyIdFromUrl]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      if (editingId) {
        await storiesApi().update(editingId, {
          title,
          content,
          genre,
          mood,
          setting,
          length_preset: lengthPreset,
        });
        setSaveMsg("Changes saved!");
      } else {
        const created = await storiesApi().create({
          title,
          content,
          genre,
          mood,
          setting,
          length_preset: lengthPreset,
        });
        setEditingId(created.id);
        router.replace(`/studio?id=${created.id}`);
        setSaveMsg("Story created!");
      }
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3500);
    }
  }, [editingId, title, content, genre, mood, setting, lengthPreset, router]);

  const handleNewStory = () => {
    setEditingId(null);
    setTitle("Untitled Story");
    setContent("");
    setGenre("");
    setMood("");
    setSetting("");
    setLengthPreset("Medium");
    setCharacterName("");
    setCharacterRole("");
    setCharacterTraits("");
    router.replace("/studio");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setSaveMsg(t("common.copied", undefined, "Copied to clipboard!"));
      setTimeout(() => setSaveMsg(""), 3000);
    });
  };

  const handleExport = () => {
    const blob = new Blob([`${title}\n\n${content}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanTitle = title.trim().toLowerCase().replace(/[^a-z0-9_-]+/gi, "_") || "story";
    a.download = `${cleanTitle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingStory) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section>
      <PageHeader
        eyebrow={t("nav.studio", undefined, "Story Studio")}
        title={
          editingId
            ? t("studio.editingTitle", { title }, `Editing: ${title}`)
            : t("studio.newStoryTitle", undefined, "Shape a New Story")
        }
        description={t(
          "studio.subtitle",
          undefined,
          "Choose creative direction, characters, and plot, then write and refine in a focused editor."
        )}
      >
        {editingId && (
          <Button variant="outline" onClick={handleNewStory} className="w-full sm:w-auto rounded-xl border-border/80">
            <FilePlus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            {t("studio.newBlankStory", undefined, "New Blank Story")}
          </Button>
        )}
        <Button
          id="generate-story-btn"
          onClick={handleGenerate}
          disabled={generating}
          className="w-full sm:w-auto rounded-xl bg-gradient-radiant text-white shadow-radiant hover:brightness-110 active:scale-95 border-0 font-bold"
        >
          <Wand2 className={`h-4 w-4 mr-1.5 ${generating ? "animate-spin" : ""}`} aria-hidden="true" />
          {generating
            ? t("studio.generatingButton", undefined, "Crafting Story…")
            : t("studio.generateButton", undefined, "Generate Story")}
        </Button>
      </PageHeader>

      {/* Mobile/Tablet Segmented View Switcher (< xl screens) */}
      <div className="flex items-center p-1 bg-surface/80 backdrop-blur-xl rounded-2xl border border-border/80 shadow-2xs xl:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileTab("settings")}
          className={cn(
            "flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
            mobileTab === "settings"
              ? "bg-primary text-white shadow-radiant"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{globalLanguage === "bn" ? "দিকনির্দেশনা ও সেটিংস" : "Story Settings"}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("editor")}
          className={cn(
            "flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
            mobileTab === "editor"
              ? "bg-primary text-white shadow-radiant"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PenTool className="h-3.5 w-3.5" />
          <span>{globalLanguage === "bn" ? "লেখার ক্যানভাস" : "Story Editor"}</span>
        </button>
      </div>

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Left Controls Panel */}
        <div
          className={cn(
            "space-y-4 xl:sticky xl:top-20 xl:self-start",
            mobileTab === "settings" ? "block" : "hidden xl:block"
          )}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t("studio.directionHeader", undefined, "Story Direction")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-foreground">{t("common.language", undefined, "Language / ভাষা")}</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage("bn")}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-center text-sm font-semibold transition-colors",
                      language === "bn"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-foreground hover:bg-surface-hover"
                    )}
                  >
                    বাংলা (Bangla)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-center text-sm font-semibold transition-colors",
                      language === "en"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-foreground hover:bg-surface-hover"
                    )}
                  >
                    English
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground">Genre</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {genres.map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGenre(g === genre ? "" : g)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors",
                        genre === g
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-surface text-foreground hover:bg-surface-hover"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="theme" className="text-sm font-semibold text-foreground">
                  Setting / Premise
                </label>
                <Input
                  id="theme"
                  placeholder="e.g. A monsoon evening in Old Dhaka with a mysterious letter"
                  className="mt-2"
                  value={setting}
                  onChange={(e) => setSetting(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground">Mood</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {moods.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(m === mood ? "" : m)}
                    >
                      <Badge variant={mood === m ? "primary" : "neutral"}>{m}</Badge>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground">Length</label>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {lengths.map((l) => (
                    <button
                      type="button"
                      key={l}
                      onClick={() => setLengthPreset(l)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-center text-xs font-semibold transition-colors",
                        lengthPreset === l
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-surface text-foreground hover:bg-surface-hover"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("studio.charactersHeader", undefined, "Characters & Roles")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Name (e.g. Anis)"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
              />
              <Input
                placeholder="Role (e.g. Antique shop owner)"
                value={characterRole}
                onChange={(e) => setCharacterRole(e.target.value)}
              />
              <Input
                placeholder="Personality / Traits (e.g. Observant, quiet, melancholic)"
                value={characterTraits}
                onChange={(e) => setCharacterTraits(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("studio.storyTitle", undefined, "Story Title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Story title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Editor Panel */}
        <div className={cn("min-w-0", mobileTab === "editor" ? "block" : "hidden xl:block")}>
          <Card className="min-w-0 rounded-3xl border border-border/80 bg-surface/85 backdrop-blur-xl shadow-card-elevated">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="font-editorial text-xl sm:text-2xl font-bold tracking-tight truncate">{title}</CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{wordCount.toLocaleString()}</span> {t("common.words", undefined, "words")} ·{" "}
                    <span className="font-medium text-foreground">{charCount.toLocaleString()}</span> {t("common.characters", undefined, "chars")} ·{" "}
                    <span className="font-medium text-foreground">{paraCount}</span> {t("common.paragraphs", undefined, "paras")} ·{" "}
                    <span className="font-semibold text-primary">{Math.max(1, Math.ceil(wordCount / 180))} min read</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {saveMsg && (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        saveMsg.includes("saved") || saveMsg.includes("created") || saveMsg.includes("Copied")
                          ? "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40"
                          : "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40"
                      }`}
                    >
                      {saveMsg}
                    </span>
                  )}
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-surface-hover h-8 w-8 sm:h-9 sm:w-9" aria-label={t("common.copy", undefined, "Copy")} onClick={handleCopy}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl border-border/80 hover:bg-surface-hover text-xs" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    <span>{t("common.exportTxt", undefined, "Export TXT")}</span>
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} id="studio-save" className="rounded-xl bg-primary text-white shadow-sm hover:brightness-105 text-xs font-semibold">
                    <Save className="h-4 w-4 mr-1.5" aria-hidden="true" />
                    {saving
                      ? t("common.saving", undefined, "Saving…")
                      : editingId
                      ? t("studio.updateStory", undefined, "Update Story")
                      : t("studio.saveStory", undefined, "Save Story")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 lg:p-6">
              <div className="story-paper min-h-[380px] sm:min-h-[560px] rounded-2xl border border-border/70 p-3.5 sm:p-6 lg:p-8 shadow-xs">
                <textarea
                  aria-label="Story editor"
                  className="min-h-[340px] sm:min-h-[500px] w-full resize-none bg-transparent font-bengali font-editorial text-[15px] sm:text-[17px] leading-[1.85] sm:leading-[2.1] text-foreground outline-none tracking-wide"
                  placeholder={t(
                    "studio.editorPlaceholder",
                    undefined,
                    "Your generated story will appear here. You can also write freely in Bangla or English."
                  )}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[500px] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <StudioContent />
    </Suspense>
  );
}
