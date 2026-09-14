import { Settings } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      icon={Settings}
      eyebrow="Settings"
      title="Workspace Settings"
      description="Manage model defaults, generation defaults, dataset storage, account, and privacy controls."
      features={[
        { title: "Model Defaults", description: "Default base model and adapter selection.", status: "Planned" },
        { title: "Generation Defaults", description: "Temperature, top-p, repetition penalty, and default length.", status: "Planned" },
        { title: "Privacy", description: "Delete stories, datasets, generations, and retained private data.", status: "Planned" },
      ]}
    />
  );
}
