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
        """Composes an evocative, diverse multi-paragraph Bengali narrative from user prompt."""
        p_lower = prompt.lower()
        characters_male = ["শুভ্র", "তানভীর", "সৌমিক", "অনির্বাণ", "অর্ক", "নির্ঝর", "রাহাত", "রুদ্র", "পলাশ", "অর্ণব", "জয়ন্ত"]
        characters_female = ["অনিন্দিতা", "মেঘলা", "অতসী", "নন্দিনী", "অপর্ণা", "অদিতি", "মৃদুলা", "তনয়া", "নীলাঞ্জনা", "সুচরিতা"]
        hero = random.choice(characters_male)
        heroine = random.choice(characters_female)

        # Detect genre / theme
        theme = "general"
        if re.search(r"প্রেম|ভালোবাসা|ভালবাসা|রোমান্টিক|love|romance|romantic|prem|valobasha|bhalobasha", prompt, re.I):
            theme = "romance"
        elif re.search(r"বৃষ্টি|মেঘ|শ্রাবণ|বর্ষা|rain|storm|brishti|megh|barsa", prompt, re.I):
            theme = "rain"
        elif re.search(r"ভয়|ভয়|ভূত|ভৌতিক|আতঙ্ক|কবর|অন্ধকার|horror|ghost|scary|fear|shadow|bhoy|voot|bhoutik", prompt, re.I):
            theme = "horror"
        elif re.search(r"রহস্য|ডিটেকটিভ|গোয়েন্দা|খুন|চিঠি|mystery|detective|secret|investigation|rohoshyo|goyenda", prompt, re.I):
            theme = "mystery"
        elif re.search(r"শৈশব|স্মৃতি|গ্রাম|নদী|মা|দাদি|স্কুল|nostalgia|childhood|village|river|gram|smriti|sad", prompt, re.I):
            theme = "nostalgia"
        elif re.search(r"ট্রেন|স্টেশন|ভ্রমণ|যাত্রা|পাহাড়|সমুদ্র|train|station|journey|travel|trip", prompt, re.I):
            theme = "journey"
        elif re.search(r"শহর|ঢাকা|রাত|স্বপ্ন|অফিস|কফি|city|dhaka|night|dream|coffee|shohor", prompt, re.I):
            theme = "city"
        else:
            all_themes = ["romance", "rain", "nostalgia", "journey", "city", "mystery", "general"]
            theme = random.choice(all_themes)

        is_meta_prompt = bool(re.search(r"^(now )?(can you )?(make|write|tell|generate)( me)? a? ?story|একটি (সুন্দর )?(গল্প|উপন্যাস) (বলো|লিখো|বানাও)|গল্প বলো|গল্প লিখো|গল্প বানাও|new story|story", prompt.strip(), re.I))
        prompt_ref = "হৃদয়ের গহীনে বহুদিনের সঞ্চিত অনুভূতিটি" if is_meta_prompt else f'"{prompt}"-এর এই গভীর ভাবনাটি'

        # Generate Title
        titles_by_theme = {
            "romance": [
                "বৃষ্টিভেজা শ্রাবণের একাকী প্রেম",
                "হৃদয়ের অলিন্দে এক চিলতে রোদ",
                "অব্যক্ত ভালোবাসার মায়াবী সুর",
                "কাজল চোখের ফেলে আসা স্মৃতি",
                "চিঠির শেষ পাতায় জমে থাকা কথা",
            ],
            "rain": [
                "শ্রাবণের মেঘমল্লার ও একলা বিকেল",
                "বৃষ্টির রিনিঝিনি আর পুরনো বারান্দা",
                "যে রাতে জানালার কাঁচে জল জমেছিল",
                "মেঘের ডানায় ভেসে আসা অতীত",
            ],
            "horror": [
                "অন্ধকার রাতের ছায়ামূর্তি",
                "শ্মশানের ওপারে প্রাচীন হাভেলি",
                "মধ্যরাতের শীতল দীর্ঘশ্বাস",
                "চিলেকোঠার গোপন আতঙ্ক",
            ],
            "mystery": [
                "অমীমাংসিত রহস্যের সন্ধানে",
                "হলুদ খামের গোপন সংকেত",
                "সেই জীর্ণ ব্রোঞ্জের চাবি",
                "কুয়াশাঢাকা গলির শেষ বাড়ি",
            ],
            "nostalgia": [
                "স্মৃতির পাতা ও একাকী গোধূলি",
                "নদীর ওপারে ফেলে আসা শৈশব",
                "সেই পুরনো মেঠোপথ আর কাশের বন",
                "হারিয়ে যাওয়া সুরের খোঁজে",
            ],
            "journey": [
                "শেষ ট্রেনের বাঁশি ও অচেনা স্টেশন",
                "পাহাড়ের বাঁকে কুয়াশার চাদর",
                "অচেনা সহযাত্রীর এক পলক",
                "পথ চলতে চলতে খুঁজে পাওয়া গন্তব্য",
            ],
            "city": [
                "মহানগরের নিস্তব্ধ রাত ও একাকী স্বপ্ন",
                "রাতের ঢাকার সোডিয়াম বাতির নিচে",
                "ট্র্যাফিক জ্যামে আটকে থাকা ভালোবাসা",
            ],
            "general": [
                "একটি অচেনা গল্পের সোনালী ভোর",
                "হৃদয়ের গভীরের একখণ্ড আলো",
                "সময়ের স্রোতে ভাসা এক জীবন",
                "যে কথা বলা হয়নি কখনো",
                "নতুন করে বাঁচার গল্প",
            ],
        }

        if re.search(r"[\u0980-\u09FF]", prompt) and 4 < len(prompt) < 40:
            clean_title = re.sub(r"[?!#*]", "", prompt).strip()
            title = random.choice(["", "স্মৃতির ", "অচেনা ", "সেই "]) + clean_title
        else:
            title = random.choice(titles_by_theme.get(theme, titles_by_theme["general"]))

        style_note = ""
        if reference_snippets:
            sample_phrase = reference_snippets[0].split("।")[0].split(".")[0].strip()
            if sample_phrase and len(sample_phrase) > 10:
                style_note = f"\n\nমনের গহীনে যেন সুরের মতো প্রতিধ্বনিত হচ্ছিল: \"{sample_phrase}...\"।"

        generators = {
            "romance": {
                "openings": [
                    f"গোধূলির আলো তখন মিলিয়ে গিয়ে আকাশ জুড়ে নেমে আসছিল অদ্ভুত এক স্নিগ্ধ মায়াবী আঁধার। বারান্দায় দাঁড়িয়ে কফির কাপে চুমুক দিচ্ছিল {heroine}। শীতল বাতাসে এক চিলতে বৃষ্টির আভাস, আর দূরে শহরের বাতিগুলো একে একে জ্বলে উঠতে শুরু করেছে। এমন নির্জন ক্ষণগুলোতে হৃদয়ের বহুদিনের জমে থাকা অব্যক্ত স্মৃতিগুলো এক নিমিষেই জীবন্ত হয়ে ওঠে।",
                    f"পুরনো ঢাকার শ্যাওলাধরা বারান্দাটিতে তখন সন্ধ্যার বাতাস এলোমেলো খেলা করছিল। টেবিলের ওপর রাখা ধোঁয়া ওঠা চায়ের কাপ আর ডায়েরির খোলা পাতা। {hero} বহুক্ষণ ধরে একটি না-পাঠানো চিঠির দিকে তাকিয়েছিল। জীবনের কতগুলো বছর নিঃশব্দে বয়ে গেল, তবু কিছু অনুভূতি সময়ের ধুলোবালিতে এতটুকু ফিকে হয় না।",
                    f"শীতের শান্ত বিকেলে কাঁচের জানালার ওপারে গাছগাছালির পাতাগুলো নীরব স্তব্ধতায় দাঁড়িয়ে ছিল। রুমের কোণে বাজছিল এক মৃদু সেতারের সুর। হাতে রাখা শুকনো কৃষ্ণচূড়ার পাপড়িটিতে হাত বোলাতেই {heroine}-র মনে পড়ে গেল বহুকাল আগের সেই বিশেষ বিকেলের কথা। কিছু মায়া হৃদয়ের এমন গহীনে লুকিয়ে থাকে যা কখনো শব্দে বলা যায় না।",
                ],
                "developments": [
                    f"হঠাৎ করেই দরজার কাছে মৃদু কড়া নাড়ার শব্দ হলো। দরজা খুলতেই থমকে গেল {heroine}। দরজার ওপাশে দাঁড়িয়ে থাকা মানুষটি যেন ঠিক সেই চিরচেনা রূপেই ফিরে এসেছে—চোখের তারায় জমে থাকা হাজারো না-বলা কথা আর ঠোঁটের কোণে সেই শান্ত মায়াবী হাসি। কোনো ভূমিকা ছিল না, কোনো অভিযোগের অবকাশ ছিল না; শুধু নিঃশব্দে দুটি চোখ একে অপরের দিকে তাকিয়ে রইল।",
                    f"বইমেলার ভিড়ের মাঝে হঠাৎ চোখাচোখি হয়ে গেল তাদের। শত শত মানুষের কোলাহলের মাঝেও মুহূর্তের জন্য পুরো পৃথিবীটা যেন স্তব্ধ হয়ে গেল। {hero} এক কদম এগিয়ে এসে বলল, \"তুমি আজও ঠিক আগের মতোই আছো।\" সেই কথায় ছিল এক অপার্থিব নির্ভরতা, যা কেবল খাঁটি ভালোবাসাই দিতে পারে।",
                    f"বৃষ্টির প্রথম বড় বড় ফোঁটাগুলো যখন মাটিতে আছড়ে পড়তে শুরু করল, ঠিক তখনই ছাতার নিচে পাশাপাশি দাঁড়াল তারা দুজন। ভেজা মাটির সোঁদা গন্ধ আর ঠান্ডা বাতাসের মাঝে দুজনের নীরব হৃদয়ের ভাষা যেন এক হয়ে মিশে গেল। কোনো কথা না বলেই যেন সবকিছু বলা হয়ে গেল।",
                ],
                "climaxes": [
                    f"{prompt_ref} যেন শুধু কোনো ক্ষণস্থায়ী কল্পনা নয়, দুজনের এত বছরের চাপা কান্নার অবসান। {hero} মৃদু হেসে বলল, \"জীবন আমাদের যেখানেই নিয়ে যাক না কেন, আমাদের ভালোবাসার ঠিকানা কখনো বদলায়নি।\" {heroine}-র চোখের কোণে চিকচিক করে উঠল এক ফোঁটা আনন্দাশ্রু।",
                    f"দুটি হাত একে অপরকে শক্ত করে জড়িয়ে ধরল। সময়ের ব্যবধানে যা কিছু হারিয়ে গিয়েছিল বলে মনে হয়েছিল, এই একটি স্পর্শেই যেন সব আবার পরিপূর্ণ হয়ে ফিরে এল। হৃদয়ের সমস্ত সংশয় আর দ্বিধার মেঘ কেটে গিয়ে উন্মোচিত হলো এক অপূর্ব বিশ্বাস।",
                ],
                "endings": [
                    f"বাইরে তখন অবিশ্রান্ত বৃষ্টির ধারায় শহর ধুয়ে যাচ্ছে। ঘরে তখন এক স্নিগ্ধ প্রদীপের নরম আলো আর দুটি হৃদয়ের পরম শান্তি। কিছু গল্প শেষ হয়েও কখনো শেষ হয় না; নতুন এক সোনালী ভোরের রূপ নিয়ে চিরকাল বেঁচে থাকে।{style_note}",
                    f"আকাশের মেঘ সরে গিয়ে এক ফালি নরম চাঁদের আলো ঘরে এসে পড়ল। জীবনের সমস্ত অসমাপ্ত বাক্যগুলো যেন আজ পূর্ণতা পেল। ভালোবাসা এক নিঃশব্দ সুরের মতো বাজতে লাগল দুজনের অন্তরে।{style_note}",
                ],
            },
            "rain": {
                "openings": [
                    f"আকাশের বুক চিরে একটানা নেমে আসছিল শ্রাবণের অঝোর বারিধারা। টিনের চালে বৃষ্টির অবিরাম রিনিঝিনি শব্দ যেন কোনো প্রাচীন বিরহী রাগিনীর সুর তুলছিল। জানালার গ্রিল ধরে বাইরে তাকিয়েছিল {heroine}। রাস্তার পিচঢালা কালো পথ তখন জলে ভেসে চকচক করছে, আর কদম ফুলের মিষ্টি ঘ্রাণে ভারী হয়ে উঠেছে পুরো এলাকা।",
                    f"শহরের ব্যস্ত ট্র্যাফিক তখন বৃষ্টির তোড়ে একদম থমকে গেছে। কাঁচঘেরা ছোট্ট ক্যাফের এক কোণে বসে গরম চায়ের কাপে চুমুক দিচ্ছিল {hero}। জানালার কাঁচে বৃষ্টির জলধারা জলের আলপনা এঁকে এঁকে গড়িয়ে পড়ছিল নিচে। এমন বাদল দিনে মন কোনো এক হারিয়ে যাওয়া মানুষের কথা বড় বেশি অনুভব করে।",
                ],
                "developments": [
                    f"বৃষ্টির বেগ যত বাড়ছিল, ঘরের ভেতরের নিস্তব্ধতা ততটাই গভীর হয়ে উঠছিল। হঠাৎ বুকশেলফের পুরনো বইগুলোর মাঝ থেকে খসে পড়ল একটি নীল খাম। খামের ওপর জলছাপ আর ভেতরের হলদে পাতায় পরিচিত সেই হাতের লেখা। প্রতিটি অক্ষরে জড়িয়ে ছিল বহু বছর আগের এক শ্রাবণ রাতের স্মৃতি।",
                    f"রাস্তার ওপারে ছাতা হাতে দাঁড়িয়ে ছিল একাকী এক পথিক। বৃষ্টির ঝাপটায় তার মুখ স্পষ্ট দেখা যাচ্ছিল না, তবু সেই পরিচিত দাঁড়ানোর ভঙ্গিটি নিমেষেই চিনতে পারল {heroine}। বুকের ভেতর অচেনা এক দোলাচল শুরু হলো।",
                ],
                "climaxes": [
                    f"{prompt_ref} যেন বৃষ্টির এই উন্মুক্ত ধারায় দাঁড়িয়ে ভাবনাকে নতুন রূপ দান করল। বৃষ্টির শীতল জলে সমস্ত পুরনো কষ্ট, দ্বিধা আর না-পাওয়ার গ্লানি ধুয়ে মুছে একাকার হয়ে গেল। মনের ক্যানভাসে জন্ম নিল এক নতুন সূচনার সাহস।",
                ],
                "endings": [
                    f"পশ্চিমের আকাশে মেঘের ফাঁক গলে বেরিয়ে এল অস্তগামী সূর্যের লালচে এক চিলতে আভা। বৃষ্টির শব্দ কমে এসে এখন কেবল পাতায় পাতায় টুপটুপ জল পড়ার মিষ্টি ধ্বনি। এক শান্ত প্রশান্তির হাসি নিয়ে নতুন দিনের দিকে মুখ ফেরাল সে।{style_note}",
                ],
            },
            "horror": {
                "openings": [
                    f"রাত তখন ঠিক আড়াইটা। চারপাশ এতটাই নিঃঝুম যে টেবিলের দেয়াল ঘড়ির টিকটিক শব্দটাও যেন অস্বাভাবিক ভারী মনে হচ্ছিল। বাইরে ঝিঁঝিঁ পোকার একঘেয়ে ডাকও হঠাৎ এক অচেনা আতঙ্কে একযোগে থেমে গেল। ঘরের ভেতরের বাতাসে ভেসে আসছিল পুরনো কাঠ আর স্যাঁতসেঁতে ভেজা মাটির এক মিশ্র গন্ধ।",
                    f"গ্রামের সীমানায় দাঁড়িয়ে থাকা শতবর্ষী সেই প্রাচীন জমিদার বাড়িটির দিকে তাকিয়ে গা শিউরে উঠছিল {hero}-র। অমারাত্রির ঘন জমাটবাঁধা অন্ধকারে বাড়িটির ভাঙা খিলানগুলো যেন কোনো এক দানবের খোলা চোয়ালের মতো দাঁড়িয়ে ছিল।",
                ],
                "developments": [
                    f"দেয়ালে পড়ে থাকা নিজের ছায়াটার দিকে তাকাতেই {heroine}-র সমস্ত রক্ত যেন বরফ হয়ে গেল। ছায়াটির ঘাড় যেন তার নিজের নড়াচড়া ছাড়াই একপাশে বেঁকে গেল! ঠিক তখনই ঘরের পেছনের বন্ধ দরজার হাতলটা কড়াৎ করে নিচে নেমে গেল।",
                    f"করিডোর ধরে হেঁটে যাওয়ার সময় হঠাৎ মনে হলো পেছনে কেউ একজন খুব নিঃশব্দে পা ফেলে আসছে। ঘাড়ের লোমগুলো দাঁড়িয়ে গেল এক বরফশীতল শ্বাসের স্পর্শে।",
                ],
                "climaxes": [
                    f"{prompt_ref} যেন চারপাশের জমাট অন্ধকারকে আরও তীব্র করে তুলল। অন্ধকারের বুক চিরে ভেসে উঠল এক জোড়া রক্তাভ জ্বলজ্বলে অপলক চোখ! কোনো মানবীয় স্বর নয়, এক অতিপ্রাকৃতিক তীব্র অনুভূতি চারপাশকে গ্রাস করে নিল।",
                ],
                "endings": [
                    f"ভোরের প্রথম আলোর রেখা যখন কুয়াশা চিরে ফুটে উঠল, তখন সেই অপচ্ছায়া বিলীন হয়ে গেল। কিন্তু মেঝের ওপর পড়ে থাকা অদ্ভুত কালো ছোপগুলো জানিয়ে দিয়ে গেল—যা ঘটেছিল, তা কোনো দুঃস্বপ্ন ছিল না।{style_note}",
                ],
            },
            "mystery": {
                "openings": [
                    f"পুরনো শহরের গোলকধাঁধার মতো সরু গলির শেষ মাথায় বাড়িটির দরজা ছিল বহু বছর ধরে সিলগালা করা। টেবিলে ছড়ানো ছিল কিছু হলদে হয়ে যাওয়া মানচিত্র, একটি ভাঙা ম্যাগনিফাইং গ্লাস আর একটি জংধরা অদ্ভুত সংকেতওয়ালা ব্রোঞ্জের চাবি। ফাইলটি হাতে নিয়ে গভীর চিন্তায় নিমগ্ন ছিল {hero}।",
                ],
                "developments": [
                    f"খামটি খুলতেই বেরিয়ে এল কিছু কোড নাম্বার আর একটি ঝাপসা সাদা-কালো ফটোগ্রাফ। ফটোগ্রাফের পেছনের ব্যক্তির মুখের আদল দেখে চমকে উঠল {heroine}। বহু বছর আগের এক অমীমাংসিত সত্য যেন চোখের সামনে মূর্ত হয়ে উঠল।",
                ],
                "climaxes": [
                    f"{prompt_ref} যেন অবশেষে নিয়ে এল বহুদিনের কাঙ্ক্ষিত উত্তর। প্রতিটি খাপছাড়া সূত্র এক নিমেষে জুড়ে গিয়ে এক বিস্ময়কর সত্য চোখের সামনে উন্মোচিত করে দিল।",
                ],
                "endings": [
                    f"সত্যের শেষ প্রমাণটি পকেটে ভরে শান্ত পায়ে কুয়াশার মাঝে হেঁটে চলে গেল {hero}। একটি রহস্যের হয়তো সমাধান হলো, কিন্তু সত্যের ভার বড় গুরুগম্ভীর।{style_note}",
                ],
            },
            "general": {
                "openings": [
                    f"কুয়াশাচ্ছন্ন এক স্নিগ্ধ নির্জন ভোরের নরম আলোয় আকাশ তখন সবে রঙিন হতে শুরু করেছে। নদীর পাড়ে দাঁড়িয়ে বাতাসে ঠান্ডা এক সতেজ শিহরণ অনুভব হচ্ছিল। জীবনের গতিপথ কখন যে কীভাবে বদলে যায়, তার কোনো আগাম পূর্বাভাস থাকে না। পেছনের ফেলে আসা দিনগুলোর স্মৃতি তখন এক স্বপ্নিল স্মৃতির মতো মনে হচ্ছিল।",
                    f"সন্ধ্যার শান্ত আকাশ তখন ধীরে ধীরে নীলের গভীরতায় হারিয়ে যাচ্ছিল। দূরের দিগন্তে সন্ধ্যার প্রথম তারাটি মিটিমিটি করে জ্বলছিল। একাকী বসে ডায়েরির পাতায় কলম ছোঁয়াতেই হৃদয়ের বহুদিনের জমে থাকা অনুভূতিগুলো কথার মালা হয়ে রূপ নিতে শুরু করল।",
                ],
                "developments": [
                    f"হঠাৎ করেই জীবনের মোড় ঘুরে যাওয়ার মতো একটি মুহূর্ত উপস্থিত হলো। পথ চলতে গিয়ে মানুষ কত বিচিত্র চরিত্রের সংস্পর্শে আসে, কিন্তু কিছু কিছু মানুষের আন্তরিক স্পর্শ সারা জীবনের জন্য মনের মণিকোঠায় অক্ষয় হয়ে থাকে। সমস্ত সংশয় আর দ্বিধার কুয়াশা কেটে গিয়ে অন্তরে জন্ম নিল গভীর এক আত্মবিশ্বাস।",
                    f"একটি পুরনো বইয়ের পাতা ওল্টাতে গিয়ে পাওয়া গেল এক শুকনো গোলাপের পাপড়ি। সুবাস অনেক আগেই মিলিয়ে গেছে, কিন্তু তার সাথে জড়িয়ে থাকা স্নেহের পবিত্রতা আজও এতটুকু মলিন হয়নি।",
                ],
                "climaxes": [
                    f"{prompt_ref} যেন অন্তরের অন্তস্তলে এক নতুন আশার মশাল জ্বেলে দিল। জীবনের প্রকৃত গৌরব তো কখনো পড়ে না যাওয়ায় নয়, বরং প্রতিবার পড়ে যাওয়ার পর আরও দৃঢ়ভাবে উঠে দাঁড়ানোর মাঝেই নিহিত।",
                ],
                "endings": [
                    f"দূরের দিগন্তে সূর্য তখন পূর্ণ তেজে উজ্জ্বল হয়ে উঠেছে। নদীর বুকে জলের কণাগুলো হীরার মতো ঝলমল করছে। এক চিলতে তৃপ্তির হাসি মুখে নিয়ে সামনে এগিয়ে গেল সে—একটি সুন্দর ভোরের সূচনায় রচিত হলো জীবনের নতুন এক গৌরবময় অধ্যায়।{style_note}",
                ],
            },
        }

        selected_gen = generators.get(theme, generators["general"])
        p1 = random.choice(selected_gen["openings"])
        p2 = random.choice(selected_gen["developments"])
        p3 = random.choice(selected_gen["climaxes"])
        p4 = random.choice(selected_gen["endings"])

        return f"# {title}\n\n{p1}\n\n{p2}\n\n{p3}\n\n{p4}"

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
