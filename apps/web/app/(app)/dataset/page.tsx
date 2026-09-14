import { Database } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function DatasetPage() {
  return (
    <PlaceholderPage
      icon={Database}
      eyebrow="Dataset"
      title="Training Data"
      description="Upload, extract, validate, tag, and version your private story collection."
      features={[
        { title: "Source Documents", description: "DOCX, PDF, and TXT files stay separate from extracted text.", status: "Planned" },
        { title: "Bangla Validation", description: "Unicode, mojibake, punctuation, and language checks will run automatically.", status: "Planned" },
        { title: "Dataset Versions", description: "Training records will be built from validated stories only.", status: "Planned" },
      ]}
    />
  );
}
