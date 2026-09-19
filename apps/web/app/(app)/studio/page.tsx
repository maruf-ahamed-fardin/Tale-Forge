"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  Download,
  FilePlus,
  RefreshCw,
  Save,
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
      if (content.trim()) {
        setContent((prev) => `${prev}\n\n${res.text}`);
      } else {
        setContent(res.text);
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
          <Button variant="outline" onClick={handleNewStory}>
            <FilePlus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            {t("studio.newBlankStory", undefined, "New Blank Story")}
          </Button>
        )}
        <Button id="generate-story-btn" onClick={handleGenerate} disabled={generating}>
          <Wand2 className={`h-4 w-4 mr-1.5 ${generating ? "animate-spin" : ""}`} aria-hidden="true" />
          {generating
            ? t("studio.generatingButton", undefined, "Crafting Story…")
            : t("studio.generateButton", undefined, "Generate Story")}
        </Button>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Left Controls Panel */}
        <div className="space-y-4">
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
                <div className="mt-2 grid grid-cols-4 gap-2">
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
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl font-serif">{title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {wordCount.toLocaleString()} {t("common.words", undefined, "words")} · {charCount.toLocaleString()} {t("common.characters", undefined, "characters")} · {paraCount} {t("common.paragraphs", undefined, "paragraphs")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {saveMsg && (
                  <span
                    className={`text-sm font-medium ${
                      saveMsg.includes("saved") || saveMsg.includes("created") || saveMsg.includes("Copied")
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {saveMsg}
                  </span>
                )}
                <Button variant="ghost" size="icon" aria-label={t("common.copy", undefined, "Copy")} onClick={handleCopy}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  {t("common.exportTxt", undefined, "Export TXT")}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} id="studio-save">
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
          <CardContent>
            <div className="story-paper min-h-[620px] rounded-lg border border-border p-5 sm:p-8">
              <textarea
                aria-label="Story editor"
                className="min-h-[560px] w-full resize-none bg-transparent font-serif text-base leading-8 text-foreground outline-none"
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
