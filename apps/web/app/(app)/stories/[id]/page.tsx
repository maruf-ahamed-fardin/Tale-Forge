import Link from "next/link";
import { Download, Heart, PenLine, Wand2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StoryDetailPage() {
  return (
    <section>
      <PageHeader eyebrow="Story Detail" title="Untitled rainy night" description="Mystery, draft, 0 words">
        <Link href="/studio" className={buttonVariants({ variant: "outline" })}>
          <PenLine className="h-4 w-4" aria-hidden="true" />
          Edit
        </Link>
        <Button>
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Continue
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Story</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="story-paper min-h-[520px] rounded-lg border border-border p-6 text-muted-foreground">
              Saved story content will appear here.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">Mystery</Badge>
              <Badge variant="warm">Mysterious</Badge>
            </div>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4" aria-hidden="true" />
              Export
            </Button>
            <Button variant="ghost" className="w-full">
              <Heart className="h-4 w-4" aria-hidden="true" />
              Favorite
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
