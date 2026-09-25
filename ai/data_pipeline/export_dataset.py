"""TaleForge Training Dataset Exporter & Formatter

Reads an account's own Bengali stories (saved by the web app's Train AI page) and formats
them into ChatML / Alpaca instruction-tuning datasets (JSONL) ready for LoRA / QLoRA fine-tuning.

Mirrors apps/web/lib/training-dataset.ts (LOCAL_LORA_CHUNKS) — keep the two in sync.
"""

import argparse
import json
import re
from pathlib import Path

# Paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PERSONAL_TRAINING_DIR = REPO_ROOT / "apps" / "web" / "storage" / "personal_training"
DEFAULT_ACCOUNT_ID = "default_local_author"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "data" / "datasets"

# Must match the system prompt used at inference time (ai/inference/local_provider.py)
SYSTEM_PROMPT = "You are TaleForge AI, an expert literary novelist specializing in Bengali literature."

# Bengali is token-heavy: Qwen2.5 uses ~1.1 tokens per character. A 650-char chunk (~720 tokens)
# plus the prompt and 150 chars of context (~260 tokens) stays under the 1024-token training limit,
# so the end of each chunk is never truncated away.
MAX_CHUNK_CHARS = 650
CONTEXT_CHARS = 150

# Stories written by Gemini / the template engine are saved with this title prefix.
# They are not the user's own voice, so they are excluded from fine-tuning.
AUTO_TRAINED_PREFIX = "Auto-Trained:"


def sanitize_account_id(raw_id: str | None) -> str:
    """Same rules as sanitizeAccountId() in apps/web/lib/story-engine.ts."""
    if not raw_id or not raw_id.strip():
        return DEFAULT_ACCOUNT_ID
    return re.sub(r"[^a-zA-Z0-9_-]", "_", raw_id.strip())[:80] or DEFAULT_ACCOUNT_ID


def chunk_story(text: str) -> list[str]:
    """Splits a story into chunks of at most MAX_CHUNK_CHARS on paragraph/sentence boundaries."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text.replace("\r\n", "\n")) if p.strip()]

    pieces: list[str] = []
    for p in paragraphs:
        if len(p) <= MAX_CHUNK_CHARS:
            pieces.append(p)
            continue
        sentences = re.findall(r"[^।?!]+[।?!]*\s*", p) or [p]
        buf = ""
        for s in sentences:
            if buf and len(buf) + len(s) > MAX_CHUNK_CHARS:
                pieces.append(buf.strip())
                buf = ""
            buf += s
        if buf.strip():
            pieces.append(buf.strip())

    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if current and len(current) + len(piece) + 2 > MAX_CHUNK_CHARS:
            chunks.append(current)
            current = ""
        current = f"{current}\n\n{piece}" if current else piece
    if current:
        chunks.append(current)
    return chunks


def build_sample(instruction: str, output: str) -> dict:
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": instruction},
            {"role": "assistant", "content": output},
        ],
        "instruction": instruction,
        "input": "",
        "output": output,
    }


def story_to_samples(title: str, text: str) -> list[dict]:
    clean_title = title.strip() or "গল্প"
    chunks = chunk_story(text)
    samples = []
    for i, chunk in enumerate(chunks):
        if i == 0:
            instruction = f"'{clean_title}' শিরোনামে একটি সাহিত্যিক বাংলা গল্প রচনা করো।"
        else:
            context = chunks[i - 1][-CONTEXT_CHARS:]
            instruction = f"'{clean_title}' গল্পটি নিচের অংশ থেকে একই ধারায় এগিয়ে নাও:\n\n\"{context}\""
        samples.append(build_sample(instruction, chunk))
    return samples


def export_dataset(
    account_id: str = DEFAULT_ACCOUNT_ID,
    memory_file: Path | None = None,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
) -> dict:
    """Exports the account's own stories into train.jsonl and val.jsonl datasets."""
    if memory_file is None:
        memory_file = PERSONAL_TRAINING_DIR / f"{sanitize_account_id(account_id)}.json"

    if not memory_file.exists():
        raise SystemExit(
            f"❌ No training memory found at {memory_file}\n"
            "   Add your stories on the web app's Train AI page first, or pass --memory / --account."
        )

    data = json.loads(memory_file.read_text(encoding="utf-8"))
    stories = [
        s
        for s in data.get("trained_stories", [])
        if s.get("text", "").strip() and not s.get("title", "").startswith(AUTO_TRAINED_PREFIX)
    ]
    if not stories:
        raise SystemExit(
            f"❌ {memory_file} has no stories of your own (auto-generated stories are excluded)."
        )

    all_samples = []
    for s in stories:
        all_samples.extend(story_to_samples(s.get("title", ""), s["text"]))

    # Hold out ~10% for validation only when there is enough data to spare
    val_count = int(len(all_samples) * 0.1) if len(all_samples) >= 10 else 0
    train_data = all_samples[: len(all_samples) - val_count]
    val_data = all_samples[len(all_samples) - val_count :]

    output_dir.mkdir(parents=True, exist_ok=True)
    train_path = output_dir / "train.jsonl"
    val_path = output_dir / "val.jsonl"

    with open(train_path, "w", encoding="utf-8") as f:
        for item in train_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    with open(val_path, "w", encoding="utf-8") as f:
        for item in val_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    total_words = sum(len(s["text"].split()) for s in stories)
    print("Dataset successfully exported:")
    print(f"  - Source: {len(stories)} stories ({total_words} words) from {memory_file}")
    print(f"  - Training samples: {len(train_data)} -> {train_path}")
    print(f"  - Validation samples: {len(val_data)} -> {val_path}")

    return {
        "success": True,
        "total_stories": len(stories),
        "total_words": total_words,
        "total_samples": len(all_samples),
        "train_samples": len(train_data),
        "val_samples": len(val_data),
        "train_path": str(train_path),
        "val_path": str(val_path),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export TaleForge stories to ML training dataset")
    parser.add_argument(
        "--account",
        type=str,
        default=DEFAULT_ACCOUNT_ID,
        help="Account ID whose stories to export (see apps/web/storage/personal_training/)",
    )
    parser.add_argument("--memory", type=Path, default=None, help="Explicit path to a personal training JSON file")
    parser.add_argument("--outdir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Output directory for datasets")
    args = parser.parse_args()

    export_dataset(args.account, args.memory, args.outdir)
