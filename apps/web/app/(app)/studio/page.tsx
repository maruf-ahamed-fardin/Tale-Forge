"use client";

import { useCallback, useState } from "react";
import { Copy, FileText, Redo2, Save, SlidersHorizontal, Undo2, Wand2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { storiesApi } from "@/lib/api";

const genres = ["Romance", "Horror", "Thriller", "Mystery", "Fantasy", "Drama"];
const moods = ["Dark", "Emotional", "Mysterious", "Romantic", "Hopeful", "Melancholic"];
const lengths = ["Short", "Medium", "Long", "Custom"];

export default function StudioPage() {
  const [title, setTitle] = useState("Untitled Story");
  const [content, setContent] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [setting, setSetting] = useState("");
  const [lengthPreset, setLengthPreset] = useState("Medium");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const paraCount = content.split(/\n\n+/).filter(Boolean).length;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      await storiesApi().create({
        title,
        content,
        genre,
        mood,
        setting,
        length_preset: lengthPreset,
      });
      setSaveMsg("Saved!");
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }, [title, content, genre, mood, setting, lengthPreset]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
  };

  return (
    <section>
      <PageHeader
        eyebrow="Story Studio"
        title="Shape a new story."
        description="Choose the creative direction, then write and revise from a focused editor."
      >
        <Button variant="outline">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Controls
        </Button>
        <Button>
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Generate Story
        </Button>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
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
                  Setting / Theme
                </label>
                <Input
                  id="theme"
                  placeholder="A man receives letters from his future self"
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
              <Input placeholder="Name" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Age" />
                <Input placeholder="Role" />
              </div>
              <Input placeholder="Personality" />
              <Input placeholder="Relationship" />
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

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{title}</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  {wordCount} words · {charCount} characters · {paraCount} paragraphs
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {saveMsg && (
                  <span className={`text-sm font-medium ${saveMsg === "Saved!" ? "text-green-600" : "text-red-600"}`}>
                    {saveMsg}
                  </span>
                )}
                <Button variant="ghost" size="icon" aria-label="Undo">
                  <Undo2 className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Redo">
                  <Redo2 className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Copy" onClick={handleCopy}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Export
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} id="studio-save">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="story-paper min-h-[620px] rounded-lg border border-border p-5 sm:p-8">
              <textarea
                aria-label="Story editor"
                className="min-h-[560px] w-full resize-none bg-transparent text-base leading-8 text-[#292524] outline-none"
                placeholder="Your generated story will appear here. You can also write freely."
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
