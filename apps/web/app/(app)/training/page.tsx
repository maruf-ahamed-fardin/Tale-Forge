import { Activity } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function TrainingPage() {
  return (
    <PlaceholderPage
      icon={Activity}
      eyebrow="Training"
      title="Training Center"
      description="Create and monitor LoRA or QLoRA adapter training runs."
      features={[
        { title: "Run Configuration", description: "Base model, dataset version, LoRA rank, batch size, and sequence length.", status: "Planned" },
        { title: "Background Jobs", description: "Long-running training will report status without blocking the API.", status: "Planned" },
        { title: "Progress Metrics", description: "GPU, epoch, loss, progress, and completion state will be visible here.", status: "Planned" },
      ]}
    />
  );
}
