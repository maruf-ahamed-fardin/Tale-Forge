import json
import os
import random
import re
import urllib.request
import urllib.error
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
        # Unless user explicitly commands English, ALWAYS write in rich literary Bengali (বাংলা)
        is_english_explicit = bool(
            re.search(r"\b(in english|only english|write in english|english story)\b", user_prompt_clean, re.I)
        )
        is_bengali = not is_english_explicit

        # Sample from trained stories for stylistic patterns
        style_snippets = []
        if self.trained_stories:
            for s in self.trained_stories[-3:]:
                style_snippets.append(s["text"][:200])

        # Check for Google Gemini API Key
        gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        active_model = "TaleForge Smart Engine"
        generated_story = ""

        if gemini_key:
            try:
                generated_story = self._generate_with_gemini(
                    user_prompt_clean, gemini_key, style_snippets, is_bengali
                )
                active_model = "Google Gemini 1.5 Flash (Live AI)"
            except Exception as e:
                print("Gemini API call failed, falling back to smart composer:", e)
                generated_story = self._compose_story(user_prompt_clean, is_bengali, style_snippets)
                active_model = "TaleForge Smart Engine (Fallback)"
        else:
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
            "model": active_model,
        }

    def _generate_with_gemini(
        self, prompt: str, api_key: str, style_snippets: list[str], is_bengali: bool
    ) -> str:
        """Calls Gemini API with style snippets from user training data."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        system_instruction = (
            "You are TaleForge AI, the premier master novelist and storyteller for Bengali Literature (বাংলা সাহিত্য).\n"
            "YOUR CORE MISSION: You MUST ALWAYS write the story strictly in authentic, beautiful, expressive Bengali (শুদ্ধ ও প্রাঞ্জল বাংলা ভাষা ও হরফে).\n"
            "Even if the user's prompt is in English or Banglish (such as 'prem er story', 'bistir rat', 'ekta meyer golpo'), you MUST write the story entirely in rich Bengali (বাংলা হরফে).\n"
            "Provide a captivating title (# শিরোনাম), an atmospheric opening, character depth, dialogues, and a touching conclusion.\n"
        )
        if style_snippets:
            system_instruction += "\nCRITICAL: Emulate the tone, vocabulary, and rhythm of these user-trained stories:\n"
            for i, s in enumerate(style_snippets):
                system_instruction += f"\n--- Sample {i+1} ---\n{s}\n"

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_instruction}\n\nPrompt: {prompt}\nPlease write a full Bengali story based on this prompt."}],
                }
            ],
            "generationConfig": {"temperature": 0.85, "maxOutputTokens": 2048},
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            candidates = res_data.get("candidates", [])
            if candidates:
                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if text.strip():
                    return text.strip()
        raise RuntimeError("No valid story candidate from Gemini API")

    def _compose_story(self, prompt: str, is_bengali: bool, reference_snippets: list[str]) -> str:
        """Composes an evocative multi-paragraph Bengali narrative from user prompt."""
        p_lower = prompt.lower()
        is_romance = bool(re.search(r"প্রেম|ভালোবাসা|ভালবাসা|রোমান্টিক|বৃষ্টি|স্মৃতি|love|romance|rain|romantic|prem|valobasha|bhalobasha", prompt, re.I))
        is_horror = bool(re.search(r"ভয়|ভয়|ভূত|ভৌতিক|আতঙ্ক|কবর|অন্ধকার|horror|ghost|scary|fear|shadow|bhoy|voot|bhoutik", prompt, re.I))
        is_mystery = bool(re.search(r"রহস্য|ডিটেকটিভ|গোয়েন্দা|খুন|চিঠি|mystery|detective|secret|investigation|rohoshyo|goyenda", prompt, re.I))

        # Title
        if is_romance:
            title = "বৃষ্টিভেজা শ্রাবণের একাকী ভালোবাসা"
        elif is_horror:
            title = "অন্ধকার রাতের ছায়ামূর্তি"
        elif is_mystery:
            title = "অমীমাংসিত রহস্যের সন্ধানে"
        elif re.search(r"[\u0980-\u09FF]", prompt):
            title = prompt[:50]
        else:
            title = "এক অচেনা গল্পের সূচনা"

        style_note = ""
        if reference_snippets:
            sample_phrase = reference_snippets[0].split("।")[0].split(".")[0].strip()
            if sample_phrase and len(sample_phrase) > 10:
                style_note = f"\n\nমনের গভীরে যেন সুরের মতো প্রতিধ্বনিত হচ্ছিল: \"{sample_phrase}\"।"

        if is_romance:
            return (
                f"# {title}\n\n"
                f"শ্রাবণের একটানা অবিরাম বৃষ্টির ধারায় শহরের অলিগলি তখন পুরোপুরি ভিজে একাকার। জানালার কাঁচ বেয়ে গড়িয়ে পড়া জলের ফোঁটার দিকে তাকিয়েছিল অনিন্দিতা। টেবিলের ওপর রাখা ধোঁয়া ওঠা চায়ের কাপ থেকে এক মিষ্টি সুবাস ঘরের বাতাসে ছড়িয়ে পড়ছিল। এমন নির্জন বিকেলে বহু বছর আগে ফেলে আসা কোনো এক চেনা মুখের স্মৃতি হঠাৎ করেই মনকে বড় ব্যাকুল করে তোলে।\n\n"
                f"হঠাৎ ফোনের স্ক্রিনে ভেসে উঠল একটি চেনা নাম। বহু বছর কোনো যোগাযোগ ছিল না, তবু সেই পরিচিত সুর যেন এক নিমিষেই সব দূরত্ব মুছে দিল। ওপাশে নীরবতা, কেবল বৃষ্টির শব্দ আর মৃদু শ্বাস। \"{prompt}\"—এই যেন শুধু একটি ভাবনা নয়, দুজনের নিঃশব্দ হৃদয়ের ভেতর এতদিন ধরে পুষে রাখা এক গভীর ভালোবাসা। দুটি চোখের অব্যক্ত ভাষা যেমন কখনো শব্দে প্রকাশ করা যায় না, তেমনই এই ক্ষণটিও যেন সময়ের গণ্ডি পেরিয়ে এক চিরন্তন ভালোবাসার সাক্ষ্য হয়ে রইল।\n\n"
                f"কফি কাপের উষ্ণতায় দুটি হাত একে অপরকে ছুঁয়ে গেল। জীবনের টানাপোড়েনে যা কিছু হারিয়ে গিয়েছিল বলে মনে হয়েছিল, এই এক পলকেই যেন সব আবার নতুন অর্থে ফিরে এল। বাইরে ঝড়ের গতি তখন মন্থর হয়ে এসেছে, মেঘের ফাঁক গলে আকাশে উঁকি দিচ্ছে নরম এক চিলতে আলো।\n\n"
                f"ভালোবাসা হয়তো সত্যিই কখনো ফুরিয়ে যায় না। সময়ের স্রোতে কেবল লুকিয়ে থাকে একান্তে, সঠিক সময়ে নতুন কোনো পূর্ণতার আশায় জেগে ওঠার জন্য।{style_note}"
            )

        if is_horror:
            return (
                f"# {title}\n\n"
                f"রাত তখন ঠিক আড়াইটা। চারপাশ এতটাই নিস্তব্ধ যে নিজের বুকের ধুকপুক শব্দও স্পষ্ট শোনা যাচ্ছিল। ঘরের কোণে রাখা শতবর্ষী পুরনো কাঠের আলমারিটা মৃদু শব্দে কেঁপে উঠল। বাতাসে ভেসে এল ভেজা মাটির সাথে পুরনো চন্দন আর জীর্ণ কাঠের এক অচেনা মিশ্র গন্ধ।\n\n"
                f"দেয়ালে নিভু নিভু মোমবাতির আলোয় পড়ে থাকা ছায়াটা যেন নিজের ইচ্ছেমতো এক পা নড়ে উঠল। বুকের ভেতর এক বরফশীতল ভয়ের স্রোত নেমে গেল। \"{prompt}\"—এই চিন্তা মাথায় আসতেই সমস্ত শরীর শিউরে উঠল। হঠাৎ দরজার হাতলটা কড়াৎ করে নিচে নামল এবং পাল্লাটি নিঃশব্দে খুলে গেল। করিডোরে কোনো মানুষ নেই, কেবল ঘন জমাটবাঁধা অন্ধকার আর এক শীতল শ্বাসের স্পর্শ ঘাড়ের চামড়ায় এসে বিঁধল।\n\n"
                f"দম বন্ধ হয়ে আসছিল। পেছনে ফিরতেই অন্ধকারের মাঝে ভেসে উঠল দুটি জ্বলজ্বলে অপলক চোখের আলো। আতঙ্কের তীব্রতায় চিৎকার করতে গিয়েও গলা দিয়ে কোনো স্বর বের হলো না... ঘরটি তখন পুরোপুরি ডুবে গেল অনন্ত এক কালচে শীতলতায়।{style_note}"
            )

        if is_mystery:
            return (
                f"# {title}\n\n"
                f"পুরনো ঢাকার গোলকধাঁধার মতো সরু গলির শেষ প্রান্তে সেই হলুদ বাড়িটা দাঁড়িয়ে ছিল শত বছরের এক অদ্ভুত নীরবতা বুকে চেপে। ঘড়ির কাঁটার তীব্র টিকটিক শব্দ জানান দিচ্ছিল হাতে সময় আর মাত্র কয়েক মিনিট। টেবিলে ছড়িয়ে ছিল কিছু পুরনো হলদে হয়ে যাওয়া চিঠি আর একটি জীর্ণ ব্রোঞ্জের চাবি।\n\n"
                f"চিঠির শেষ পাতায় গাঢ় লাল কালিতে লেখা একটি অস্পষ্ট সংকেত। \"{prompt}\"—এই সূত্রটাই হয়তো বহু বছর ধরে লুকিয়ে রাখা সেই পারিবারিক রহস্যের শেষ চাবিকাঠি। ঠিক তখনই কাঠের সিঁড়িতে ভারী বুটের পদশব্দ প্রতিধ্বনিত হলো। কেউ একজন খুব সন্তর্পণে উপরে উঠে আসছে।\n\n"
                f"অর্ণব চাবিটা পকেটে পুরে পেছনের গুপ্ত দরজার দিকে পা বাড়াল। সত্য প্রকাশের এই খেলায় ভুল করার কোনো সুযোগ নেই। আজ রাতেই হয়তো এই অন্ধকার অধ্যায়ের চূড়ান্ত ইতি ঘটতে চলেছে।{style_note}"
            )

        # Default rich Bengali story
        return (
            f"# {title}\n\n"
            f"কুয়াশাচ্ছন্ন এক নির্জন ভোরের নরম আলোয় আকাশ তখন সবে রঙিন হতে শুরু করেছে। নদীর পাড়ে দাঁড়িয়ে বাতাসে ঠান্ডা এক শিহরণ অনুভব হচ্ছিল। জীবনের গতিপথ কখন যে কীভাবে বদলে যায়, তার কোনো আগাম পূর্বাভাস থাকে না। পেছনের ফেলে আসা দিনগুলোর স্মৃতি তখন এক সুদূর স্বপ্নের মতো মনে হচ্ছিল।\n\n"
            f"\"{prompt}\"—এই ভাবনাটি যেন অন্তরের গভীরে এক নতুন আশার আলো জ্বেলে দিল। পথ চলতে গিয়ে মানুষ কত মানুষের সংস্পর্শে আসে, কিন্তু কিছু কিছু অনুভূতি সারাজীবনের সঙ্গী হয়ে থেকে যায়। মনের সব দ্বিধা আর সংশয়ের মেঘ কেটে গিয়ে জন্ম নিল এক গভীর আত্মবিশ্বাস। জীবনের আসল সৌন্দর্য তো পরাজয়ে নয়, বারবার নতুন করে ভালোবাসতে শেখায়।\n\n"
            f"দূরের দিগন্তে সূর্য তখন পূর্ণ তেজে উজ্জ্বল হয়ে উঠেছে। নদীর জলে আলোর কণাগুলো তারার মতো ঝিলমিল করছে। এক চিলতে তৃপ্তির হাসি মুখে নিয়ে সামনে এগিয়ে গেল সে—একটি সুন্দর ভোরের সূচনায় রচিত হলো জীবনের নতুন এক সোনালী অধ্যায়।{style_note}"
        )
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
