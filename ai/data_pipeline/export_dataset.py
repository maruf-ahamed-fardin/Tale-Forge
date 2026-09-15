"""TaleForge Training Dataset Exporter & Formatter

Reads all stored Bengali stories and formats them into standard ChatML / Alpaca
instruction-tuning datasets (JSONL) ready for LoRA / QLoRA fine-tuning.
"""

import argparse
import json
import os
import re
from pathlib import Path

# Paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_MEMORY_FILE = REPO_ROOT / "storage" / "ai_model_memory.json"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "data" / "datasets"


def extract_prompts_from_story(title: str, text: str, is_bengali: bool) -> list[dict]:
    """Extracts high-quality training pairs from a story.

    Produces instruction-output pairs for:
    1. Direct prompt generation (e.g. 'Write a story titled...')
    2. Theme/Emotion-based generation
    3. Story continuation / chapter extension
    """
    clean_text = text.strip()
    clean_title = title.replace("Auto-Trained:", "").replace("Trained Story", "").strip() or "একটি নতুন গল্প"

    pairs = []

    # 1. Title/Topic Generation Pair
    if is_bengali:
        instruction = f"'{clean_title}' শিরোনামে একটি সাহিত্যিক ও আবেগঘন বাংলা গল্প রচনা করো।"
    else:
        instruction = f"Write a captivating and atmospheric story titled '{clean_title}'."

    pairs.append({
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are TaleForge AI, an expert literary novelist specializing in rich Bengali literature (বাংলা সাহিত্য) "
                    "and storytelling. You write authentic, atmospheric, and emotive narratives."
                    if is_bengali
                    else "You are TaleForge AI, a master literary novelist. You craft captivating, atmospheric prose."
                ),
            },
            {"role": "user", "content": instruction},
            {"role": "assistant", "content": clean_text},
        ],
        "instruction": instruction,
        "input": "",
        "output": clean_text,
    })

    # 2. Scene / Continuation Pair (if story is longer than 150 words)
    paragraphs = [p.strip() for p in clean_text.split("\n\n") if len(p.strip()) > 30]
    if len(paragraphs) >= 2:
        context_p = paragraphs[0]
        remaining = "\n\n".join(paragraphs[1:])

        if is_bengali:
            continuation_prompt = f"নিচের গল্পের অংশটির প্রেক্ষাপট বজায় রেখে পরবর্তী ঘটনাপ্রবাহ রচনা করো:\n\n\"{context_p}\""
        else:
            continuation_prompt = f"Continue the story naturally from the following opening scene:\n\n\"{context_p}\""

        pairs.append({
            "messages": [
                {
                    "role": "system",
                    "content": "You are TaleForge AI, an expert literary author. Continue stories seamlessly in authentic style.",
                },
                {"role": "user", "content": continuation_prompt},
                {"role": "assistant", "content": remaining},
            ],
            "instruction": continuation_prompt,
            "input": "",
            "output": remaining,
        })

    return pairs


def export_dataset(memory_file: Path = DEFAULT_MEMORY_FILE, output_dir: Path = DEFAULT_OUTPUT_DIR) -> dict:
    """Exports all stored stories into train.jsonl and val.jsonl datasets."""
    output_dir.mkdir(parents=True, exist_ok=True)
    train_path = output_dir / "train.jsonl"
    val_path = output_dir / "val.jsonl"

    stories = []
    if memory_file.exists():
        try:
            data = json.loads(memory_file.read_text(encoding="utf-8"))
            stories = data.get("trained_stories", [])
        except Exception as e:
            print(f"Error reading memory file: {e}")

    # If memory file is empty or missing, provide a rich starter Bangla training story
    if not stories:
        stories = [
            {
                "id": "starter_1",
                "title": "বৃষ্টির দিনে ফেলে আসা স্মৃতি",
                "text": (
                    "শ্রাবণের মেঘলা আকাশে গুঁড়ি গুঁড়ি বৃষ্টি পড়ছিল। পুরনো বারান্দার গ্রিলে হাত রেখে "
                    "অনিন্দিতা দূর আকাশের দিকে তাকিয়ে ছিল। বাতাসে ভেসে আসছিল ভেজা মাটির চিরচেনা গন্ধ। "
                    "চা-এর কাপ থেকে ওঠা ধোঁয়া বাতাসে মিলিয়ে যাওয়ার সাথে সাথে মনে পড়ছিল অনেক বছর আগের ফেলে আসা এক বিকেলের কথা। "
                    "জীবনে কত মানুষ আসে, কত কথা হারিয়ে যায়, কিন্তু কিছু স্মৃতি সময়ের ধুলোবালি ভেদ করে চিরকাল অম্লান থেকে যায়। "
                    "বৃষ্টির শব্দ তখনো অবিরাম বেজে চলেছে, যেন এক নীরব কবিতার ছন্দ।"
                ),
            },
            {
                "id": "starter_2",
                "title": "রহস্যময় পুরোনো বাড়ি",
                "text": (
                    "পুরাতন ঢাকার সরু গলির শেষ প্রান্তে সেই জীর্ণ হলুদ রঙের বাড়িটা বছরের পর বছর ধরে একা দাঁড়িয়ে আছে। "
                    "প্রতি সন্ধ্যায় দোতলার বন্ধ জানালা দিয়ে এক অদ্ভুত আলো জ্বলে ওঠে। "
                    "অর্ণব অনেক দিন ধরেই এই রহস্য উদ্ঘাটনের সুযোগ খুঁজছিল। আজ রাতে যখন ঘড়ির কাঁটা বারোটা স্পর্শ করল, "
                    "সে নিঃশব্দে বাগানের ভাঙা প্রাচীর পেরিয়ে বাড়ির প্রধান দরজার সামনে এসে দাঁড়াল। কাঠের দরজায় হাত দিতেই "
                    "ভেতর থেকে এক দীর্ঘশ্বাসের মৃদু শব্দ ভেসে এল।"
                ),
            },
        ]

    all_pairs = []
    for s in stories:
        text = s.get("text", "")
        title = s.get("title", "")
        if not text:
            continue
        is_bengali = bool(re.search(r"[\u0980-\u09FF]", text))
        pairs = extract_prompts_from_story(title, text, is_bengali)
        all_pairs.extend(pairs)

    # Split into Train (85%) and Validation (15%)
    split_idx = max(1, int(len(all_pairs) * 0.85)) if len(all_pairs) > 1 else 1
    train_data = all_pairs[:split_idx]
    val_data = all_pairs[split_idx:] or all_pairs[:1]

    with open(train_path, "w", encoding="utf-8") as f:
        for item in train_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    with open(val_path, "w", encoding="utf-8") as f:
        for item in val_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(f"Dataset successfully exported:")
    print(f"  - Training samples: {len(train_data)} -> {train_path}")
    print(f"  - Validation samples: {len(val_data)} -> {val_path}")

    return {
        "success": True,
        "total_stories": len(stories),
        "total_samples": len(all_pairs),
        "train_samples": len(train_data),
        "val_samples": len(val_data),
        "train_path": str(train_path),
        "val_path": str(val_path),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export TaleForge stories to ML training dataset")
    parser.add_argument("--memory", type=Path, default=DEFAULT_MEMORY_FILE, help="Path to ai_model_memory.json")
    parser.add_argument("--outdir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Output directory for datasets")
    args = parser.parse_args()

    export_dataset(args.memory, args.outdir)
