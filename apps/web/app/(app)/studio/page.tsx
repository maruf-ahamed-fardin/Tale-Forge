import { Copy, FileText, Redo2, Save, SlidersHorizontal, Undo2, Wand2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const genres = ["Romance", "Horror", "Thriller", "Mystery", "Fantasy", "Drama"];
const moods = ["Dark", "Emotional", "Mysterious", "Romantic", "Hopeful", "Melancholic"];
const lengths = ["Short", "Medium", "Long", "Custom"];

export default function StudioPage() {
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
                  {genres.map((genre) => (
                    <button
                      type="button"
                      key={genre}
                      className="rounded-lg border border-border bg-white px-3 py-2 text-left text-sm font-semibold text-[#44403c] hover:bg-[#f7f4ef]"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="theme" className="text-sm font-semibold text-[#292524]">
                  Theme
                </label>
                <Input id="theme" placeholder="A man receives letters from his future self" className="mt-2" />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#292524]">Mood</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {moods.map((mood) => (
                    <Badge key={mood} variant={mood === "Mysterious" ? "primary" : "neutral"}>
                      {mood}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#292524]">Length</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {lengths.map((length) => (
                    <button
                      type="button"
                      key={length}
                      className="rounded-lg border border-border bg-white px-2 py-2 text-center text-xs font-semibold text-[#44403c] hover:bg-[#f7f4ef]"
                    >
                      {length}
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
              <CardTitle>Setting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Old Dhaka, rainy night" />
              <Textarea placeholder="Additional instructions" />
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Untitled Story</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">0 words, 0 characters, 0 paragraphs</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="icon" aria-label="Undo">
                  <Undo2 className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Redo">
                  <Redo2 className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Copy">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Export
                </Button>
                <Button size="sm">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="story-paper min-h-[620px] rounded-lg border border-border p-5 sm:p-8">
              <textarea
                aria-label="Story editor"
                className="min-h-[560px] w-full resize-none bg-transparent text-base leading-8 text-[#292524] outline-none"
                placeholder="Your generated story will appear here."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
