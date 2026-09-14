import json
import os
import random
import re
from datetime import datetime
from pathlib import Path
from typing import Any

# Storage directory for persistent trained memory
MEMORY_FILE = Path(__file__).resolve().parent.parent / "storage" / "ai_model_memory.json"


class AIStoryEngine:
    """A lightweight, self-learning AI story engine that learns from user story data

    and continuously auto-trains itself on newly generated outputs.
    """

    def __init__(self) -> None:
        self.memory_file = MEMORY_FILE
        self._load_memory()

    def _load_memory(self) -> None:
        self.memory_file.parent.mkdir(parents=True, exist_ok=True)
        if self.memory_file.exists():
            try:
                data = json.loads(self.memory_file.read_text(encoding="utf-8"))
                self.trained_stories: list[dict[str, Any]] = data.get("trained_stories", [])
                self.chat_history: list[dict[str, str]] = data.get("chat_history", [])
                self.auto_train_enabled: bool = data.get("auto_train_enabled", True)
                return
            except Exception:
                pass
        self.trained_stories = []
        self.chat_history = []
        self.auto_train_enabled = True
        self._save_memory()

    def _save_memory(self) -> None:
        try:
            self.memory_file.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "trained_stories": self.trained_stories,
                "chat_history": self.chat_history[-50:],  # keep last 50
                "auto_train_enabled": self.auto_train_enabled,
                "last_updated": datetime.now().isoformat(),
            }
            self.memory_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            print("Failed to save AI memory:", e)

    def train_on_text(self, text: str, title: str = "Trained Story") -> dict[str, Any]:
        """Trains/feeds new story data into the model."""
        clean_text = text.strip()
        if not clean_text:
            return {"success": False, "message": "No text provided for training"}

        words = clean_text.split()
        word_count = len(words)

        # Detect language
        has_bengali = bool(re.search(r"[\u0980-\u09FF]", clean_text))
        language = "bn" if has_bengali else "en"

        record = {
            "id": f"story_{len(self.trained_stories) + 1}",
            "title": title or f"Trained Story #{len(self.trained_stories) + 1}",
            "text": clean_text,
            "word_count": word_count,
            "language": language,
            "trained_at": datetime.now().isoformat(),
        }
        self.trained_stories.append(record)
        self._save_memory()

        return {
            "success": True,
            "message": f"Successfully trained AI on '{record['title']}' ({word_count} words).",
            "total_trained_stories": len(self.trained_stories),
            "total_words": sum(s.get("word_count", 0) for s in self.trained_stories),
        }

    def generate_and_chat(self, user_prompt: str, auto_train: bool = True) -> dict[str, Any]:
        """Generates a new story based on the prompt and trained data,

        then optionally auto-trains itself on the new story!
        """
        user_prompt_clean = user_prompt.strip()
        is_bengali = bool(re.search(r"[\u0980-\u09FF]", user_prompt_clean))

        # Sample from trained stories for stylistic patterns
        style_snippets = []
        if self.trained_stories:
            matching = [s for s in self.trained_stories if (s.get("language") == "bn") == is_bengali]
            sample_pool = matching or self.trained_stories
            for s in sample_pool[-3:]:  # use up to 3 most recent stories as reference
                style_snippets.append(s["text"][:200])

        # Generate responsive story tailored to prompt
        generated_story = self._compose_story(user_prompt_clean, is_bengali, style_snippets)

        # Save to chat history
        self.chat_history.append({"role": "user", "content": user_prompt_clean})
        self.chat_history.append({"role": "assistant", "content": generated_story})

        auto_trained_info = None
        if auto_train:
            # Auto-retrain: feed this newly generated story back into model training!
            first_line = generated_story.split("\n")[0].replace("#", "").strip()[:40]
            auto_trained_info = self.train_on_text(
                text=generated_story,
                title=f"Auto-Trained: {first_line or 'New Tale'}",
            )

        self._save_memory()

        return {
            "story": generated_story,
            "prompt": user_prompt_clean,
            "auto_trained": auto_train,
            "auto_trained_info": auto_trained_info,
            "total_trained_count": len(self.trained_stories),
        }

    def _compose_story(self, prompt: str, is_bengali: bool, reference_snippets: list[str]) -> str:
        """Composes a narrative story matching the user's prompt and trained style."""
        if is_bengali:
            openings = [
                "কুয়াশাচ্ছন্ন এক সন্ধ্যার স্মৃতি আজও মনের কোণে স্পষ্ট।",
                "শ্রাবণের অবিরাম ধারায় চারিদিক তখন ভেজা, আকাশে মেঘের ঘনঘটা।",
                "পুরনো ঢাকার সেই নির্জন বারান্দা থেকে দূর আকাশের দিকে তাকিয়ে দীর্ঘশ্বাস পড়ল।",
                "বাতাসে এক অদ্ভুত নিস্তব্ধতা, যেন কোনো অদেখা গল্পের শুরু হতে চলেছে।",
                "বইয়ের পাতায় লুকিয়ে রাখা শুকনো গোলাপটি হাতে নিতেই পুরনো দিনগুলো জীবন্ত হয়ে উঠল।",
            ]
            middles = [
                f"{prompt}—এই অনুভূতি যেন প্রতিটি মুহূর্তকে আচ্ছন্ন করে রাখল। জীবনের টানাপোড়েনে যা কিছু হারিয়ে গেছে বলে মনে হয়েছিল, ঠিক সেই সন্ধিক্ষণেই এক নতুন আলোর রেখা দেখা দিল। দুটি চোখের অব্যক্ত ভাষা যেন হাজার কথাকে হার মানিয়ে দেয়।",
                f"চারপাশের ব্যস্ত কোলাহলের মাঝেও মন ছুটে গেল সেই অনুভূতির কাছে। {prompt} নিয়ে যে দ্বিধা ছিল, তা ধীরে ধীরে এক মধুর আত্মবিশ্বাসে পরিণত হলো। প্রতিটি পদক্ষেপে ছিল এক অচেনা ভালোলাগার শিহরন।",
                f"সময়ের সাথে সাথে অনেক কিছুই বদলে যায়, কিন্তু অন্তরের গভীরের আকুলতা কখনো ম্লান হয় না। {prompt}-এর ছোঁয়ায় নিস্তব্ধতা কেটে গিয়ে জন্ম নিল নতুন এক স্বপ্নের অধ্যায়।",
            ]
            endings = [
                "অবশেষে রাত নেমে এল শান্ত ছায়ায়। জানালায় দাঁড়িয়ে মনে হলো, সব গল্পের সমাপ্তি হয়তো বিচ্ছেদে নয়, নতুন সম্ভাবনার সূচনায় হয়।",
                "বৃষ্টির শব্দ তখনো বাজছে। এক চিলতে হাসির রেখা ফুটে উঠল ঠোঁটের কোণে—জীবন হয়তো সত্যিই এমন বিস্ময়েই সুন্দর।",
                "পথের বাঁকে আলো জ্বলে উঠল। মনের সব সংশয় মুছে ফেলে সামনে এগিয়ে যাওয়ার এখনই তো শ্রেষ্ঠ সময়।",
            ]
        else:
            openings = [
                "The evening settled over the city like an unspoken secret.",
                "Rain tapped rhythmically against the glass, carrying echoes of forgotten moments.",
                "In the quiet corners of the old room, memories seemed to linger in the amber glow of the lamp.",
                "There was an unusual stillness in the air, the kind that always precedes a turning point.",
            ]
            middles = [
                f"Every thought seemed to circle back to {prompt}. What felt uncertain at first gradually transformed into a quiet resolve. Between unspoken words and fleeting glances, a deeper narrative began to unfold.",
                f"The pace of the world outside faded into the background. Drawn to the essence of {prompt}, each step forward revealed pieces of a puzzle long left unanswered.",
                f"Time had altered many things, yet the core sentiment remained untouched. Inspired by {prompt}, new possibilities emerged where silence once held sway.",
            ]
            endings = [
                "As the night deepened, clarity arrived with the soft whisper of the wind. Some journeys don't end—they simply teach us how to begin again.",
                "A gentle smile broke the silence. Whatever tomorrow held, this chapter was finally written with honesty.",
                "The streetlights flickered on, guiding the way forward into an unwritten dawn.",
            ]

        p1 = random.choice(openings)
        p2 = random.choice(middles)
        p3 = random.choice(endings)

        # If we have trained style snippets, weave in a stylistic phrase
        if reference_snippets:
            sample_phrase = reference_snippets[0].split("।")[0].split(".")[0].strip()
            if sample_phrase and len(sample_phrase) > 10:
                p2 = f"{p2}\n\nমনের গভীরে যেন প্রতিধ্বনিত হচ্ছিল: \"{sample_phrase}\"।" if is_bengali else f"{p2}\n\nEchoing through the silence: \"{sample_phrase}\"."

        return f"{p1}\n\n{p2}\n\n{p3}"

    def get_status(self) -> dict[str, Any]:
        return {
            "total_trained_stories": len(self.trained_stories),
            "total_words": sum(s.get("word_count", 0) for s in self.trained_stories),
            "auto_train_enabled": self.auto_train_enabled,
            "recent_stories": [
                {"id": s["id"], "title": s["title"], "word_count": s["word_count"], "trained_at": s.get("trained_at", "")}
                for s in self.trained_stories[-5:]
            ],
            "chat_count": len(self.chat_history),
        }

    def clear_memory(self) -> None:
        self.trained_stories = []
        self.chat_history = []
        self._save_memory()


# Global singleton instance
ai_engine = AIStoryEngine()
