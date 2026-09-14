import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type PlaceholderFeature = {
  title: string;
  description: string;
  status?: string;
};

export function PlaceholderPage({
  icon: Icon,
  eyebrow,
  title,
  description,
  features,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  features: PlaceholderFeature[];
}) {
  return (
    <section>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2ff] text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            {feature.status ? (
              <CardContent>
                <Badge variant="primary">{feature.status}</Badge>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
