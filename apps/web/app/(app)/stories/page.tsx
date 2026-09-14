import Link from "next/link";
import { Filter, Grid2X2, List, Search, Star } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const samples = [
  {
    id: "sample-draft",
    title: "Untitled rainy night",
    genre: "Mystery",
    preview: "A quiet draft space waiting for the first saved TaleForge story.",
    words: 0,
  },
  {
    id: "sample-horror",
    title: "Abandoned house concept",
    genre: "Horror",
    preview: "A future generation can be saved here, edited, continued, and exported.",
    words: 0,
  },
];

export default function StoriesPage() {
  return (
    <section>
      <PageHeader eyebrow="Story Library" title="My Stories" description="Search, filter, favorite, and reopen saved work.">
        <Button variant="outline" size="icon" aria-label="Grid view">
          <Grid2X2 className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="List view">
          <List className="h-4 w-4" aria-hidden="true" />
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search stories" />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4" aria-hidden="true" />
          Genre
        </Button>
        <Button variant="outline">
          <Star className="h-4 w-4" aria-hidden="true" />
          Favorites
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {samples.map((story) => (
          <Card key={story.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="primary">{story.genre}</Badge>
                  <CardTitle className="mt-3">{story.title}</CardTitle>
                </div>
                <Star className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <CardDescription>{story.preview}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{story.words} words</span>
              <Link href={`/stories/${story.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Open
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
