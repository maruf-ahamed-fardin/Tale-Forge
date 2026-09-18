import json
import os
import random
import re
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from typing import Any

# Storage directory for persistent memory
STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage"
PERSONAL_TRAINING_DIR = STORAGE_DIR / "personal_training"
DEFAULT_ACCOUNT_ID = "default_local_author"

DEFAULT_TRAINED_STORIES = [
    {
        "id": "default_story_1",
        "title": "মধ্যরাতের বৃষ্টি ও এক চিলতে জোছনা",
        "genre": "হুমায়ূন আহমেদ ধারা",
        "author_style": "জাদুকরি বাস্তবতা, নিঃসঙ্গ রাত ও গভীর মায়া",
        "is_default": True,
        "word_count": 245,
        "language": "bn",
        "trained_at": "2026-01-01T00:00:00.000Z",
        "text": """শ্রাবণের একটানা অবিরাম বর্ষণে পুরাতন ঢাকার নিস্তব্ধ গলিপথ তখন ভেসে যাচ্ছিল। টিনের চালে জলের অবিশ্রান্ত ছন্দ যেন কোনো প্রাচীন বিরহী রাগিনীর সুর বাজাচ্ছিল। কাঁচঘেরা বারান্দার এক কোণে বসে এক কাপ এলাচ দেওয়া চা হাতে নিয়ে বাইরের আঁধারের দিকে তাকিয়েছিল শুভ্র।

ঠিক রাত বারোটা চার মিনিটে হঠাৎ করেই আকাশ চিরে মেঘের বুক গলে এক ফালি অদ্ভুত নীলচে জোছনা এসে পড়ল বারান্দার একপাশে। বৃষ্টির ধারার মাঝেই এমন জোছনার খেলা যেন প্রকৃতির এক জাদুকরি বিস্ময়। এমন বৃষ্টিভেজা জোছনা রাতে মনের বহুদিনের সঞ্চিত অনুভূতিগুলো এক নিমিষেই জীবন্ত হয়ে ওঠে।

হঠাৎ দরজার গোড়ায় খুব হালকা পদশব্দ হলো। কড়া নাড়ারও কোনো তাড়া ছিল না, যেন বহুদিনের অতিচেনা এক ছায়ামূর্তি নিঃশব্দে এসে দাঁড়িয়েছে। শুভ্র দরজা খুলতেই থমকে গেল। দরজার ওপাশে দাঁড়িয়ে থাকা মানুষটির চোখের কোণে জমে ছিল এক অপার বিষাদ আর ঠোঁটে সেই মায়াবী উদাসীন হাসি—"শুভ্র, তুমি আজও বৃষ্টির রাতে রাত জাগো?"

কোনো অভিযোগের স্থান ছিল না, কোনো অভিমানী শব্দের উচ্চারণ হলো না। কেবল জানালার কাঁচে বৃষ্টির জলের ধারা বয়ে চলার মাঝে দুটি মানুষ এক কাপ চায়ের ধোঁয়ার ওপারে বসে জীবনের হারিয়ে যাওয়া দিনগুলোর হিসেব মেলাতে লাগল। কিছু গল্প কখনো কোনো পূর্ণচ্ছেদ চায় না; বৃষ্টির জলের মতোই অনন্তকাল ধরে অন্তরের গহীনে বহমান থেকে যায়।""",
    },
    {
        "id": "default_story_2",
        "title": "প্রাচীন হাভেলি ও অষ্টধাতুর ব্রোঞ্জ ঘড়ি",
        "genre": "সত্যজিৎ রায় ও ফেলুদা রহস্য ধারা",
        "author_style": "বুদ্ধিবৃত্তিক পর্যবেক্ষণ, তীক্ষ্ণ যুক্তি ও টানটান সাসপেন্স",
        "is_default": True,
        "word_count": 238,
        "language": "bn",
        "trained_at": "2026-01-02T00:00:00.000Z",
        "text": """কুয়াশামোড়া ডিসেম্বরের শান্ত সকালে পদ্মাপাড়ের শতবর্ষী প্রাচীন রায় চৌধুরীদের হাভেলির কাঠের সিংহদুয়ারটি নিঃশব্দে খুলে গেল। দেউড়িতে দাঁড়িয়ে গন্ধটা প্রথম নাকে এল—বহুদিনের পুরনো চন্দনকাঠ, ভেজা নোনা মাটির দেয়াল আর ধুলোজমা ব্রাস মেটালের এক অদ্ভুত গন্ধ।

টেবিলের ওপর রাখা ছিল একটি অষ্টধাতুর তৈরি প্রাচীন ব্রোঞ্জ ঘড়ি, যার পেণ্ডুলামটি গত চল্লিশ বছর ধরে স্তব্ধ ছিল বলে দাবি করা হতো। অথচ আজ ভোর সাড়ে পাঁচটায় ঠিক বারোবার গম্ভীর শব্দে বেজে উঠেছে সেই নিস্তব্ধ ঘড়ি। ঘড়ির তলার গোপন ড্রয়ারটি তখন ইঞ্চিখানেক খোলা।

ম্যাগনিফাইং গ্লাস দিয়ে ড্রয়ারের কারুকার্য খচিত খাঁজগুলো পরীক্ষা করতেই ধরা পড়ল এক অকাট্য সূত্র—সেখানে কোনো চাবি দিয়ে জোর করার দাগ নেই, বরং এক ফোঁটা তাজা চেরির রস লেগে রয়েছে। এই প্রাসাদে চেরি ফলের প্রবেশাধিকার কেবল একজনেরই ছিল, যিনি গতকাল রাতেই অসুস্থতার ভান করে ঘরে খিল এঁটেছিলেন।

বাইরে তখন শীতের ভোরের কুয়াশা ফুঁড়ে সূর্যের প্রথম তীক্ষ্ণ আলো এসে পড়ল ঘড়ির কাঁচের ডায়ালে। রহস্যের জটিল চাদর ভেদ করে সত্যের মুখ উন্মোচিত হতে আর মাত্র কয়েক মিনিটের অপেক্ষা ছিল। বুদ্ধির ক্ষুরধার চালে যে কোনো জটিল সংকেতই শেষ পর্যন্ত এক সরল সমীকরণে এসে দাঁড়ায়।""",
    },
    {
        "id": "default_story_3",
        "title": "কাশফুলের মেঠোপথ ও ফিরে আসা শৈশব",
        "genre": "বিভূতিভূষণ পল্লীসাহিত্য ধারা",
        "author_style": "গ্রামবাংলার রূপ, মেঠোপথ, নদীর ঘাট ও শিকড়ের অপার্থিব টান",
        "is_default": True,
        "word_count": 242,
        "language": "bn",
        "trained_at": "2026-01-03T00:00:00.000Z",
        "text": """শরতের সোনালী রোদ তখন ইছামতীর শান্ত জলে হিলহিলে রূপোলি আলো ছড়াচ্ছিল। নদীর পাড়ের উঁচু ঢিবির ওপর দিগন্তজোড়া কাশবন মৃদুমন্দ বাতাসে একযোগে দোলা খাচ্ছিল, যেন দূর দেশের কাউকে সাদরে ঘরে ফেরার নিমন্ত্রণ জানাচ্ছে। মেঠোপথ ধরে বহু বছর পর নিজের ফেলে আসা ভিটেমাটির দিকে এগোচ্ছিল অনুপম।

বাতাসে ভাসছিল ভেজা ঘাসের মিষ্টি গন্ধ আর পাকা ধানের সোঁদা সুবাস। পথচলতি অচেনা রাখাল বালকটি যখন গরু তাড়িয়ে নিয়ে যেতে যেতে আপন মনে মিষ্টি সুরে বাঁশি বাজিয়ে গেল, অনুপমের বুকের ভেতর এক অদ্ভুত হাহাকার জেগে উঠল। এই সেই বাঁশের পুল, এই সেই শ্যাওলাধরা প্রাচীন বটগাছের ছায়া—যেখানে ছেলেবেলার বন্ধুদের সাথে কত শত দুপুর নিমেষেই হারিয়ে যেত।

মাটির দাওয়ায় পা রাখতেই চোখে পড়ল উঠোনের কোণে সেই ডালিম গাছটি আজও তেমনিভাবে দাঁড়িয়ে আছে। লালচে ফুলগুলো মৃদু বাতাসে ঝরে পড়ছে উঠোনের ধুলোয়। অনুপম হাঁটু গেড়ে বসে একমুঠো জন্মমাটি হাতে তুলে নিল। শহুরে জীবনের যান্ত্রিক কোলাহল, কৃত্রিম মর্যাদা আর অর্থের অহংকার এক নিমিষেই ধুয়েমুছে গেল। মানুষ জীবনের তাগিদে যত দূরেই চলে যাক না কেন, তার প্রকৃত আত্মার শান্তি লুকিয়ে থাকে এই মাটির খাঁটি মমতার আঁচলেই।""",
    },
    {
        "id": "default_story_4",
        "title": "সন্ধ্যার খেয়াঘাট ও না-বলা চিঠি",
        "genre": "রবীন্দ্রনাথ ও শরৎচন্দ্র ক্লাসিক ধারা",
        "author_style": "ভাবগম্ভীর ক্লাসিক্যাল গদ্য, আত্মত্যাগ ও চিরন্তন মানবিক দ্বন্দ্ব",
        "is_default": True,
        "word_count": 251,
        "language": "bn",
        "trained_at": "2026-01-04T00:00:00.000Z",
        "text": """মেঘমেদুর গোধূলিলগ্নে নদীর ওপারে যখন সন্ধ্যার আরতিধ্বনি মন্দিরের ঘণ্টার সাথে তাল মিলিয়ে বেজে উঠছিল, তখন খেয়াঘাটের জীর্ণ বটবৃক্ষের তলায় এসে দাঁড়াল হেমাঙ্গিনী। নদীর কালো জলের স্রোতে তখন ওপারের সান্ধ্য বাতির ম্লান ছায়া কাঁপছিল। তার হাতে ধরা ছিল বহু বছর ধরে সযত্নে লুকিয়ে রাখা রেশমি ফিতায় বাঁধা একখানা জীর্ণ চিঠি।

চিঠির প্রতিটি অক্ষরের ভাঁজে জড়িয়ে ছিল এক নীরব আত্মত্যাগ ও নিঃশব্দ আত্মনিবেদনের ইতিবৃত্ত। সমাজের কঠোর অনুশাসন আর ভাগ্যের পরিহাস যাকে কখনো আপন হতে দেয়নি, স্মৃতির মণিকোঠায় সেই মানুষটির স্থান ছিল সবার ঊর্ধ্বে। খেয়ানৌকাটি যখন ঘাটে এসে লাগল, মাঝির গম্ভীর হাঁক শোনা গেল—"ওপারে যাইবেন দিদিমণি?"

হেমাঙ্গিনী নদীর স্রোতের দিকে চাইল। অন্তরের সমস্ত দ্বিধা, বহু বছরের সঞ্চিত বেদনা আর লোকলজ্জার ভারী বোঝা যেন এক মুহূর্তে লঘু হয়ে গেল। সে আলতো করে রেশমি ফিতাটি খুলে চিঠিখানি ভাসিয়ে দিল নদীর শান্ত তরঙ্গে। কাগজের তরীটি সন্ধ্যার আবছায়ায় ভাসতে ভাসতে দূর দিগন্তের মোহনার দিকে মিলিয়ে গেল। কিছু প্রেম কোনো প্রাপ্তির অপেক্ষা করে না, কেবল হৃদয়ের নীরব আত্মত্যাগে অনন্তকালের জন্য অমর হয়ে থাকে।""",
    },
    {
        "id": "default_story_5",
        "title": "সোডিয়াম বাতির নিচে মহানগর ও একাকী স্বপ্ন",
        "genre": "আধুনিক জীবনবোধ ও নগর বাস্তবতা",
        "author_style": "মধ্যরাতের শহরের মনস্তত্ত্ব, আত্মবিশ্বাস ও লড়াকু জীবন",
        "is_default": True,
        "word_count": 236,
        "language": "bn",
        "trained_at": "2026-01-05T00:00:00.000Z",
        "text": """রাত আড়াইটায় ফার্মগেটের ওভারব্রিজের ওপর দাঁড়ালে পুরো ঢাকাকে সম্পূর্ণ ভিন্ন এক শহর বলে মনে হয়। দিনের বেলার তীব্র ধুলো, বাসের তীব্র হর্ন আর মানুষের ক্লান্ত পদচারণার কোনো চিহ্ন এখন আর নেই। সোডিয়াম বাতির একঘেয়ে হলুদ আলোয় ভিজে থাকা পিচঢালা রাজপথটি যেন এক নিঃশব্দ দীর্ঘশ্বাস।

ব্রিজের রেলিং ধরে ঠান্ডা বাতাসে দাঁড়িয়েছিল ফারহান। পকেটে রাখা ল্যাপটপের ব্যাগে তার গত ছয় মাসের অক্লান্ত পরিশ্রমের তৈরি সফটওয়্যারের ব্লুপ্রিন্ট। দিনে একটি সামান্য বেতনের কাজ আর রাতে না ঘুমিয়ে নিজের স্বপ্নের প্রজেক্ট তৈরি করা—গত দুটি বছর এভাবেই কেটে গেছে তার। অনেকেই তাকে পাগল বলেছে, অনেকেই হাল ছেড়ে দিতে বলেছে।

কিন্তু এই সুবিশাল কংক্রিটের শহরটি যেমন কঠিন, তেমনই এর গভীরে লুকিয়ে আছে অজস্র লড়াকু মানুষের স্বপ্ন। দূরের তেজগাঁও রেললাইনের ওপর দিয়ে হুইসেল বাজিয়ে একটি মালবাহী ট্রেন ছুটে চলে গেল রাতের অন্ধকারের বুক চিরে। ফারহান পকেট থেকে এক চিলতে হাসিমুখ নিয়ে ফোনটা বের করল। ভোরের আলো ফুটতে আর মাত্র দুই ঘণ্টা বাকি। প্রতিটি অন্ধকার রাতের শেষেই এক নতুন বিজয়ের সোনালী প্রভাত অপেক্ষা করে।""",
    },
    {
        "id": "default_story_6",
        "title": "কালবৈশাখীর মেঘ ও নীল খামের শেষ পাতা",
        "genre": "কাব্যিক প্রেম ও মানবিক পুনর্মিলন",
        "author_style": "আবেগময় আকুলতা, ঝড়ো হাওয়া ও হৃদয়ের স্পন্দন",
        "is_default": True,
        "word_count": 228,
        "language": "bn",
        "trained_at": "2026-01-06T00:00:00.000Z",
        "text": """বৈশাখী বিকেলের আকাশ হঠাৎ করেই কালচে সিঁদুরে মেঘে ঢেকে গেল। উত্তর-পশ্চিম কোণ থেকে ধেয়ে আসা মাতাল বাতাসের প্রথম ঝাপটাতেই বারান্দার টবের রজনীগন্ধাগুলো নত হয়ে পড়ল। ঘরের কাঁচের জানালায় এসে আছড়ে পড়তে লাগল প্রথম ঝোড়ো বৃষ্টির ফোঁটা।

টেবিলের ওপর ছড়িয়ে থাকা কাগজপত্রের মাঝ থেকে হঠাৎ খসে পড়ল একটি নীল খাম। এই খামটি গত সাত বছর ধরে স্পর্শ করার সাহস হয়নি তনয়ার। খামের ভেতরে রাখা শুকনো বকুল ফুলের পাপড়িগুলো আজ ধুলো হয়ে গেছে, কিন্তু চিঠির শেষ পঙক্তিটি আজও তেমনি স্পষ্ট—"যেখানে সীমানা শেষ হয়, সেখানেই আমাদের অপেক্ষার শুরু।"

বিদ্যুতের তীব্র চমকে ঘরটি এক পলকের জন্য আলোয় ভেসে উঠল। তনয়া জানালার কাছে এসে দাঁড়াল। শীতল বৃষ্টির ছাঁট তার মুখে এসে লাগতেই চোখ দিয়ে গড়িয়ে পড়ল বহুদিনের রুদ্ধ অশ্রু। ঠিক তখনই কলিং বেলের পরিচিত একটানা ছন্দ বাজল। দরজা খুলে তনয়া দেখল, ভেজা ছাতা হাতে ঠিক তেমনিভাবে দাঁড়িয়ে আছে সেই হারিয়ে যাওয়া মানুষটি। দীর্ঘ বিরহের পর কালবৈশাখীর ঝড়ের তোড়ে দুটি হৃদয় আবার এক শান্ত মোহনায় এসে মিলিত হলো।""",
    },
]


class AIStoryEngine:
    """A lightweight, self-learning AI story engine with curated master Bengali literature
    and isolated, account-specific personal training memory.
    """

    def __init__(self) -> None:
        self.personal_stories: dict[str, list[dict[str, Any]]] = {}
        self.chat_history: dict[str, list[dict[str, str]]] = {}
        self.default_stories = DEFAULT_TRAINED_STORIES

    def _sanitize_account_id(self, account_id: str | None) -> str:
        if not account_id or not str(account_id).strip():
            return DEFAULT_ACCOUNT_ID
        return re.sub(r"[^a-zA-Z0-9_-]", "_", str(account_id).strip())[:80] or DEFAULT_ACCOUNT_ID

    def _get_account_file(self, account_id: str) -> Path:
        safe_id = self._sanitize_account_id(account_id)
        PERSONAL_TRAINING_DIR.mkdir(parents=True, exist_ok=True)
        return PERSONAL_TRAINING_DIR / f"{safe_id}.json"

    def _load_account_memory(self, account_id: str) -> None:
        safe_id = self._sanitize_account_id(account_id)
        if safe_id in self.personal_stories:
            return

        file_path = self._get_account_file(safe_id)
        if file_path.exists():
            try:
                data = json.loads(file_path.read_text(encoding="utf-8"))
                self.personal_stories[safe_id] = data.get("trained_stories", [])
                self.chat_history[safe_id] = data.get("chat_history", [])
                return
            except Exception:
                pass

        self.personal_stories[safe_id] = []
        self.chat_history[safe_id] = []

    def _save_account_memory(self, account_id: str) -> None:
        safe_id = self._sanitize_account_id(account_id)
        try:
            PERSONAL_TRAINING_DIR.mkdir(parents=True, exist_ok=True)
            file_path = self._get_account_file(safe_id)
            data = {
                "account_id": safe_id,
                "trained_stories": self.personal_stories.get(safe_id, []),
                "chat_history": (self.chat_history.get(safe_id, []))[-50:],
                "last_updated": datetime.now().isoformat(),
            }
            file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"Failed to save personal training memory for {safe_id}:", e)

    def train_on_text(self, text: str, title: str = "Trained Story", account_id: str = DEFAULT_ACCOUNT_ID) -> dict[str, Any]:
        """Trains and feeds new personal story data into the model for this specific user account."""
        safe_id = self._sanitize_account_id(account_id)
        self._load_account_memory(safe_id)

        clean_text = text.strip()
        if not clean_text:
            return {"success": False, "message": "No text provided for training"}

        words = clean_text.split()
        word_count = len(words)
        has_bengali = bool(re.search(r"[\u0980-\u09FF]", clean_text))
        language = "bn" if has_bengali else "en"

        account_list = self.personal_stories.setdefault(safe_id, [])
        record = {
            "id": f"personal_{safe_id}_{len(account_list) + 1}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "title": title or f"Trained Story #{len(account_list) + 1}",
            "text": clean_text,
            "word_count": word_count,
            "language": language,
            "is_default": False,
            "trained_at": datetime.now().isoformat(),
        }
        account_list.append(record)
        self._save_account_memory(safe_id)

        personal_words = sum(s.get("word_count", 0) for s in account_list)
        default_words = sum(s.get("word_count", 0) for s in self.default_stories)

        return {
            "success": True,
            "message": f"আপনার অ্যাকাউন্ট ({safe_id})-এ '{record['title']}' ({word_count} শব্দ) সফলভাবে ট্রেইন করা হয়েছে।",
            "account_id": safe_id,
            "personal_trained_stories": len(account_list),
            "personal_words": personal_words,
            "total_trained_stories": len(self.default_stories) + len(account_list),
            "total_words": default_words + personal_words,
        }

    def generate_and_chat(
        self,
        user_prompt: str,
        auto_train: bool = True,
        training_scope: str = "hybrid",
        account_id: str = DEFAULT_ACCOUNT_ID,
    ) -> dict[str, Any]:
        """Generates a new story based on the chosen training scope and prompt,
        then optionally auto-trains itself back into the account's personal store!
        """
        safe_id = self._sanitize_account_id(account_id)
        self._load_account_memory(safe_id)

        user_prompt_clean = user_prompt.strip()
        is_english_explicit = bool(
            re.search(r"\b(in english|only english|write in english|english story)\b", user_prompt_clean, re.I)
        )
        is_bengali = not is_english_explicit

        # Sample style snippets based on training_scope
        style_snippets = []
        personal_list = self.personal_stories.get(safe_id, [])

        if training_scope == "personal":
            if personal_list:
                for s in personal_list[-4:]:
                    style_snippets.append(s["text"][:350])
            else:
                for s in self.default_stories[:2]:
                    style_snippets.append(s["text"][:350])
        elif training_scope == "default":
            for s in self.default_stories[:4]:
                style_snippets.append(s["text"][:350])
        else:  # hybrid
            if personal_list:
                for s in personal_list[-2:]:
                    style_snippets.append(f"[ব্যক্তিগত স্বর]: {s['text'][:350]}")
            needed = 2 if personal_list else 4
            for s in self.default_stories[:needed]:
                style_snippets.append(f"[ডিফল্ট সাহিত্য]: {s['text'][:350]}")

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

        # Save to chat history for this account
        chat_list = self.chat_history.setdefault(safe_id, [])
        chat_list.append({"role": "user", "content": user_prompt_clean})
        chat_list.append({"role": "assistant", "content": generated_story})

        auto_trained_info = None
        if auto_train:
            first_line = generated_story.split("\n")[0].replace("#", "").strip()[:40]
            auto_trained_info = self.train_on_text(
                text=generated_story,
                title=f"Auto-Trained: {first_line or 'New Tale'}",
                account_id=safe_id,
            )

        self._save_account_memory(safe_id)

        total_stories = len(self.default_stories) + len(personal_list)

        return {
            "story": generated_story,
            "prompt": user_prompt_clean,
            "auto_trained": auto_train,
            "auto_trained_info": auto_trained_info,
            "total_trained_count": total_stories,
            "model": active_model,
            "training_scope": training_scope,
            "account_id": safe_id,
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

    def get_status(self, account_id: str = DEFAULT_ACCOUNT_ID) -> dict[str, Any]:
        safe_id = self._sanitize_account_id(account_id)
        self._load_account_memory(safe_id)

        personal_list = self.personal_stories.get(safe_id, [])
        default_words = sum(s.get("word_count", 0) for s in self.default_stories)
        personal_words = sum(s.get("word_count", 0) for s in personal_list)

        recent_stories = [
            {
                "id": s["id"],
                "title": s["title"],
                "word_count": s["word_count"],
                "trained_at": s.get("trained_at", ""),
                "is_default": False,
                "text": s.get("text", ""),
                "language": s.get("language", "bn"),
            }
            for s in personal_list
        ] + [
            {
                "id": s["id"],
                "title": s["title"],
                "word_count": s["word_count"],
                "trained_at": s.get("trained_at", ""),
                "is_default": True,
                "text": s.get("text", ""),
                "language": s.get("language", "bn"),
                "genre": s.get("genre", ""),
            }
            for s in self.default_stories
        ]

        return {
            "total_trained_stories": len(self.default_stories) + len(personal_list),
            "total_words": default_words + personal_words,
            "default_stories": self.default_stories,
            "personal_stories": personal_list,
            "default_words": default_words,
            "personal_words": personal_words,
            "account_id": safe_id,
            "auto_train_enabled": True,
            "recent_stories": recent_stories,
            "trained_stories": personal_list if personal_list else self.default_stories,
            "chat_count": len(self.chat_history.get(safe_id, [])),
        }

    def delete_story(self, story_id: str, account_id: str = DEFAULT_ACCOUNT_ID) -> dict[str, Any]:
        safe_id = self._sanitize_account_id(account_id)
        self._load_account_memory(safe_id)

        if any(s["id"] == story_id for s in self.default_stories):
            raise ValueError("ডিফল্ট মাস্টার সাহিত্য গল্পগুলো সিস্টেম প্রটেক্টেড, এগুলো মোছা যাবে না।")

        current_list = self.personal_stories.get(safe_id, [])
        self.personal_stories[safe_id] = [s for s in current_list if s["id"] != story_id]
        self._save_account_memory(safe_id)
        return self.get_status(safe_id)

    def clear_memory(self, account_id: str = DEFAULT_ACCOUNT_ID) -> None:
        safe_id = self._sanitize_account_id(account_id)
        self.personal_stories[safe_id] = []
        self.chat_history[safe_id] = []
        self._save_account_memory(safe_id)


# Global singleton instance
ai_engine = AIStoryEngine()
