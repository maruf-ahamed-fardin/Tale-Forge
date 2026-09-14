"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  Download,
  FilePlus,
  FileText,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Undo2,
  Wand2,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { storiesApi } from "@/lib/api";

const genres = ["Romance", "Horror", "Thriller", "Mystery", "Fantasy", "Drama"];
const moods = ["Dark", "Emotional", "Mysterious", "Romantic", "Hopeful", "Melancholic"];
const lengths = ["Short", "Medium", "Long", "Custom"];

function StudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const storyIdFromUrl = searchParams.get("id");
  const actionFromUrl = searchParams.get("action");

  const [editingId, setEditingId] = useState<string | null>(storyIdFromUrl);
  const [title, setTitle] = useState("Untitled Story");
  const [content, setContent] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [setting, setSetting] = useState("");
  const [lengthPreset, setLengthPreset] = useState("Medium");
  const [characterName, setCharacterName] = useState("");
  const [characterRole, setCharacterRole] = useState("");
  const [characterTraits, setCharacterTraits] = useState("");
  const [loadingStory, setLoadingStory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

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
      setSaveMsg("Copied to clipboard!");
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
        eyebrow="Story Studio"
        title={editingId ? `Editing: ${title}` : "Shape a new story."}
        description={
          editingId
            ? "Revise, expand, or refine your saved story."
            : "Choose the creative direction, then write and revise from a focused editor."
        }
      >
        {editingId && (
          <Button variant="outline" onClick={handleNewStory}>
            <FilePlus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            New Blank Story
          </Button>
        )}
        <Button id="generate-story-btn">
          <Wand2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
          {actionFromUrl === "continue" ? "Continue Story" : "Generate Story"}
        </Button>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Left Controls Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Direction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-[#292524]">Genre</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {genres.map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGenre(g === genre ? "" : g)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                        genre === g
                          ? "border-primary bg-[#eef2ff] text-primary"
                          : "border-border bg-white text-[#44403c] hover:bg-[#f7f4ef]"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="theme" className="text-sm font-semibold text-[#292524]">
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
                <label className="text-sm font-semibold text-[#292524]">Mood</label>
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
                <label className="text-sm font-semibold text-[#292524]">Length</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {lengths.map((l) => (
                    <button
                      type="button"
                      key={l}
                      onClick={() => setLengthPreset(l)}
                      className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold transition-colors ${
                        lengthPreset === l
                          ? "border-primary bg-[#eef2ff] text-primary"
                          : "border-border bg-white text-[#44403c] hover:bg-[#f7f4ef]"
                      }`}
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
              <CardTitle>Characters</CardTitle>
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
              <CardTitle>Title</CardTitle>
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
                  {wordCount.toLocaleString()} words · {charCount.toLocaleString()} characters · {paraCount} paragraphs
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {saveMsg && (
                  <span
                    className={`text-sm font-medium ${
                      saveMsg.includes("saved") || saveMsg.includes("created") || saveMsg.includes("Copied")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {saveMsg}
                  </span>
                )}
                <Button variant="ghost" size="icon" aria-label="Copy" onClick={handleCopy}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Export TXT
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} id="studio-save">
                  <Save className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  {saving ? "Saving…" : editingId ? "Update Story" : "Save Story"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="story-paper min-h-[620px] rounded-lg border border-border p-5 sm:p-8">
              <textarea
                aria-label="Story editor"
                className="min-h-[560px] w-full resize-none bg-transparent font-serif text-base leading-8 text-[#292524] outline-none"
                placeholder="Your generated story will appear here. You can also write freely in Bangla or English."
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
