import { ClipboardCheck } from "lucide-react";

import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default function EvaluationPage() {
  return (
    <PlaceholderPage
      icon={ClipboardCheck}
      eyebrow="Evaluation"
      title="Evaluation Center"
      description="Compare generated stories against quality, style, Bangla, genre, and originality checks."
      features={[
        { title: "Style Similarity", description: "Sentence length, vocabulary, punctuation, dialogue ratio, and pacing.", status: "Planned" },
        { title: "Originality", description: "N-gram and similarity checks will flag suspicious overlap.", status: "Planned" },
        { title: "Human Scores", description: "Style match, Bangla quality, story quality, originality, and genre match.", status: "Planned" },
      ]}
    />
  );
}
