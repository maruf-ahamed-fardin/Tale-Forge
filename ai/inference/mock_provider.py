import asyncio
from collections.abc import AsyncGenerator

from ai.inference.provider import GenerationParams, GenerationResult, StoryGenerationProvider

# Narrative templates for contextual generation
GENRE_STORIES_BN: dict[str, str] = {
    "Mystery": (
        "পুরাতন ঢাকার সরু গলির শেষ প্রান্তে একটি পুরনো হলুদ রঙের বাড়ি দাঁড়িয়ে আছে। "
        "{setting_clause}সেখানে প্রতি সন্ধ্যায় এক অদ্ভুত বাঁশির সুর ভেসে আসে। "
        "{character_clause}হাতে একটি জীর্ণ কাঠের বাক্স, যার ডালায় খোদাই করা এক অচেনা প্রতীক। "
        "চিঠির প্রতিটি অক্ষরে যেন লুকিয়ে আছে বহু বছর আগের কোনো অমীমাংসিত সত্য। "
        "দরজার কড়া নাড়ার শব্দে স্তব্ধতা ভেঙে গেল। বাইরে দাঁড়িয়ে ছিল এক ছায়ামূর্তি, "
        "যার চোখ দুটো অন্ধকারে অদ্ভুতভাবে জ্বলজ্বল করছিল। রহস্যের জাল যেন ক্রমেই ঘনিয়ে আসছে।"
    ),
    "Romance": (
        "বৃষ্টিভেজা বিকেলের বাতাসে ভেসে আসছিল শিউলি ফুলের ভেজা সুবাস। "
        "{setting_clause}ক্যাফেটেরিয়ার কোণে রাখা কাঁচের টেবিলে রাখা ছিল এক কাপ উষ্ণ চা। "
        "{character_clause}দৃষ্টি আটকে গেল জানালার কাঁচের ওপারে জমে থাকা জলবিন্দুগুলোর দিকে। "
        "হঠাৎ একটি পরিচিত কণ্ঠস্বরে চমকে পেছনে ফিরতেই দেখা মিলল সেই হাসিমুখের। "
        "বহু বছর পরে দেখা হলেও মনে হলো কোনো দূরত্বই ছিল না। কথা না বলেও যেন সব কথাই বলা হয়ে গেল এক নিমিষে।"
    ),
    "Horror": (
        "রাত তখন ঠিক আড়াইটা। ঝিঁঝিঁ পোকার ডাকও একসময় হঠাৎ নিস্তব্ধ হয়ে গেল। "
        "{setting_clause}ঘরের কোণে কাঠের আলমারিটা মৃদু শব্দে কেঁপে উঠল। "
        "{character_clause}বুকের ভেতর ভয়ের শীতল স্রোত নেমে এল। বাতাসে ভেসে এল ভেজা মাটির সাথে পুরনো চন্দনের গন্ধ। "
        "দেয়ালের ছায়াটা যেন নিজে থেকেই নড়ে উঠল, অথচ ঘরে আলো দেওয়ার মতো কিছুই ছিল না। "
        "পেছন থেকে এক বরফশীতল শ্বাসের স্পর্শ ঘাড়ে এসে লাগল।"
    ),
    "Thriller": (
        "ঘড়ির কাঁটা সেকেন্ডের হিসাব গুনছে। হাতে সময় আর মাত্র বারো মিনিট। "
        "{setting_clause}ফোনের অপর প্রান্তের নির্দেশ স্পষ্ট—ভুল করার কোনো সুযোগ নেই। "
        "{character_clause}গাড়ির এক্সিলারেটরে চাপ দিল। পেছনের কালো এসইউভিটা এক চুলও দূরত্ব কমাচ্ছে না। "
        "কাঁচ নামিয়ে এক ঝলক তাকাল, তারপর হঠাৎ বাঁক নিয়ে ঢুকে পড়ল অন্ধকার মাটির নিচের টানেলে। "
        "খেলাটা এখন কেবল বাঁচার নয়, সত্য উন্মোচনের।"
    ),
    "Fantasy": (
        "কুয়াশাচ্ছন্ন নীল উপত্যকার ওপারে জেগে আছে প্রাচীন রুপালী বৃক্ষ। "
        "{setting_clause}বাতাসে জাদুকরী স্ফুলিঙ্গ উড়ে বেড়াচ্ছে তারার মতো। "
        "{character_clause}হাতের তলোয়ারের খাপে জ্বলছে নীলিমার আলো। "
        "আকাশের মেঘ চিরে নেমে এল ডানাওয়ালা এক মহিমান্বিত পক্ষীরাজ। "
        "পূর্বপুরুষদের ভবিষ্যদ্বাণী সত্যি হতে চলেছে, রাজ্য বাঁচাতে এখন নতুন অভিযানের সূচনা।"
    ),
    "Drama": (
        "স্মৃতির অ্যালবামটা ওল্টাতেই এক টুকরো শুকনো গোলাপ ঝরে পড়ল কাঠের মেঝেতে। "
        "{setting_clause}বিকেলের নরম রোদ এসে পড়েছে বসার ঘরের ধুলোমাখা বইগুলোর ওপর। "
        "{character_clause}একটা দীর্ঘশ্বাস ফেলে জানালায় গিয়ে দাঁড়াল। জীবন কখনো কখনো এত অপ্রত্যাশিত মোড় নেয় "
        "যে পেছনের সব হিসাব এলোমেলো হয়ে যায়। তবু এগিয়ে যেতে হয়, নতুন ভোরের আশায়।"
    ),
}

GENRE_STORIES_EN: dict[str, str] = {
    "Mystery": (
        "The fog hung heavy over the cobblestone alley. "
        "{setting_clause}In the faint yellow glow of the streetlamp, footsteps echoed and vanished. "
        "{character_clause}held the rusted brass key tightly, wondering if this night would finally unlock "
        "the truth buried ten winters ago. As the grandfather clock struck three, a sealed envelope slid slowly beneath the door."
    ),
    "Romance": (
        "Rain beat a quiet rhythm against the glass of the quiet coffee shop. "
        "{setting_clause}A melody played softly in the background, stirring memories of summer evenings. "
        "{character_clause}looked up as the brass bell chimed above the entrance. After years of silence, "
        "their eyes met across the room, and time seemed to pause in recognition."
    ),
    "Horror": (
        "The silence of the house was heavier than darkness itself. "
        "{setting_clause}The floorboards on the stairs let out a sharp, rhythmic creak. "
        "{character_clause}stood frozen, breath catching in the throat as a freezing breeze swept through the shuttered room. "
        "A pale hand emerged from the shadows of the doorway."
    ),
    "Thriller": (
        "Every second felt compressed into a razor's edge. "
        "{setting_clause}The encrypted terminal flashed amber: countdown initiated. "
        "{character_clause}slammed the briefcase shut and took the emergency stairwell three steps at a time. "
        "Footsteps pounded close behind—there was no room for hesitation now."
    ),
    "Fantasy": (
        "Beyond the Whispering Ridge stood the obsidian citadel beneath twin moons. "
        "{setting_clause}Runes pulsed with violet fire across the ancient gateway. "
        "{character_clause}drew the blade forged in starlight, watching the clouds part for the arrival of the dragon lords."
    ),
    "Drama": (
        "The faded photograph rested on the polished walnut desk. "
        "{setting_clause}After decades of unspoken distances, this reunion held the weight of a lifetime. "
        "{character_clause}stepped into the hallway, ready to face the memories that had defined every choice along the way."
    ),
}


class MockStoryProvider(StoryGenerationProvider):
    """Local, lightweight mock story generation provider for testing and development."""

    async def generate(self, params: GenerationParams) -> GenerationResult:
        await asyncio.sleep(0.4)  # simulate brief thinking time

        # Build contextual clauses
        setting_clause = f"ঘটনাস্থল: {params.setting}। " if params.setting and params.language == "bn" else (
            f"The scene was set around {params.setting}. " if params.setting else ""
        )

        char_name = params.character_name or "অপরিচিত চরিত্র"
        char_role = f" ({params.character_role})" if params.character_role else ""
        char_traits = f", যার স্বভাব {params.character_traits}" if params.character_traits else ""

        if params.language == "bn":
            character_clause = f"{char_name}{char_role}{char_traits}, " if params.character_name else ""
            templates = GENRE_STORIES_BN
            fallback_template = GENRE_STORIES_BN["Drama"]
        else:
            char_name = params.character_name or "The protagonist"
            char_role = f", as a {params.character_role}" if params.character_role else ""
            char_traits = f" known for being {params.character_traits}" if params.character_traits else ""
            character_clause = f"{char_name}{char_role}{char_traits}, " if params.character_name else ""
            templates = GENRE_STORIES_EN
            fallback_template = GENRE_STORIES_EN["Drama"]

        template = templates.get(params.genre, fallback_template)
        body = template.format(
            setting_clause=setting_clause,
            character_clause=character_clause,
        )

        # Expand length based on length_preset
        if params.length_preset == "Long":
            paragraphs = [body, body, body]
        elif params.length_preset == "Short":
            paragraphs = [body]
        else:
            paragraphs = [body, body]

        full_text = "\n\n".join(paragraphs)
        word_count = len(full_text.split())

        return GenerationResult(
            text=full_text,
            word_count=word_count,
            finish_reason="stop",
            provider="taleforge-mock",
        )

    async def stream(self, params: GenerationParams) -> AsyncGenerator[str, None]:
        result = await self.generate(params)
        words = result.text.split(" ")
        for i in range(0, len(words), 4):
            chunk = " ".join(words[i : i + 4]) + " "
            yield chunk
            await asyncio.sleep(0.05)
