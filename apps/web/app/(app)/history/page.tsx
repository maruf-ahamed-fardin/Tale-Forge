import { History } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function HistoryPage() {
  return (
    <PlaceholderPage
      icon={History}
      eyebrow="History"
      title="Generation History"
      description="Review prompts, settings, outputs, model versions, and timestamps."
      features={[
        { title: "Saved Outputs", description: "Generated stories can be reopened, duplicated, saved, or deleted.", status: "Planned" },
        { title: "Prompt Records", description: "Genre, theme, mood, characters, and full prompt metadata.", status: "Planned" },
        { title: "Model Trace", description: "Each generation will record the active model version.", status: "Planned" },
      ]}
    />
  );
}
