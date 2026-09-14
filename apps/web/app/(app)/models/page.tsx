import { Boxes } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function ModelsPage() {
  return (
    <PlaceholderPage
      icon={Boxes}
      eyebrow="Models"
      title="Model Management"
      description="Register base models, adapters, versions, and active generation defaults."
      features={[
        { title: "Model Versions", description: "Every trained adapter will receive an immutable version.", status: "Planned" },
        { title: "Adapter Registry", description: "Base model, dataset version, training config, and adapter path.", status: "Planned" },
        { title: "Activation", description: "A selected model can become the default for story generation.", status: "Planned" },
      ]}
    />
  );
}
