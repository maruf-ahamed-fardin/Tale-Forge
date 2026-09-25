"""TaleForge Training Dataset Exporter & Formatter

Reads an account's own Bengali stories (saved by the web app's Train AI page) and formats
them into ChatML / Alpaca instruction-tuning datasets (JSONL) ready for LoRA / QLoRA fine-tuning.

Each story becomes several training conversations:
  - write:    "write a story titled X" -> first chunk (instruction rotated through Bengali, Banglish, English)
  - expand:   short draft -> "make it longer" -> full first chunk (teaches follow-up instructions)
  - continue: previous chunk's ending -> "continue" -> next chunk, as a real multi-turn conversation

Mirrors apps/web/lib/training-dataset.ts — keep the two in sync.
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

# Must match TRAINING_SYSTEM_PROMPT in apps/web/lib/system-prompt.ts and the inference prompt in
# ai/inference/local_provider.py, so the model sees the same framing at training and chat time.
SYSTEM_PROMPT = (
    "You are TaleForge AI, an expert literary novelist specializing in Bengali literature. "
    "Follow the user's latest instruction exactly. If they ask to expand, continue, shorten, rewrite or change "
    "the previous story, work on that story from the conversation and keep its title, characters and events. "
    "Otherwise write a new story. Write in Bengali unless the user asks for English."
)

# Bengali is token-heavy: Qwen2.5 uses ~1.1 tokens per character. A 650-char chunk (~720 tokens)
# plus the multi-turn prompt (short draft + instruction, ~450 tokens) stays under the 1792-token training limit.
MAX_CHUNK_CHARS = 650
CONTEXT_CHARS = 150
SHORT_DRAFT_CHARS = 260

# Stories written by Gemini / the template engine are saved with this title prefix.
# They are not the user's own voice, so they are excluded from fine-tuning.
AUTO_TRAINED_PREFIX = "Auto-Trained:"

# The same request phrased in Bengali, Banglish and English, so the model obeys all three.
LANGS = ("bn", "banglish", "en")
WRITE_INSTRUCTIONS = {
    "bn": lambda title: f"'{title}' শিরোনামে একটি সাহিত্যিক বাংলা গল্প রচনা করো।",
    "banglish": lambda title: f"'{title}' name e ekta shundor bangla golpo lekho.",
    "en": lambda title: f"Write a literary Bengali story titled '{title}'.",
}
SHORT_INSTRUCTIONS = {
    "bn": lambda title: f"'{title}' শিরোনামে একটি ছোট গল্প লেখো, কয়েক লাইনে।",
    "banglish": lambda title: f"'{title}' name e ekta choto golpo lekho, koyek line e.",
    "en": lambda title: f"Write a very short story titled '{title}', just a few lines.",
}
EXPAND_INSTRUCTIONS = {
    "bn": "এই গল্পটা আরও বড় করো। একই শিরোনাম, চরিত্র আর ঘটনা রেখে বিস্তারিতভাবে লেখো।",
    "banglish": "ei golpo ta aro boro koro. same title, character ar ghotona rekhe details e lekho.",
    "en": "Make this story longer. Keep the same title, characters and events, and write it in detail.",
}
CONTINUE_INSTRUCTIONS = {
    "bn": "গল্পটা যেখানে শেষ হয়েছে সেখান থেকে একই ধারায় চালিয়ে যাও।",
    "banglish": "golpo ta jekhane shesh hoyeche shekhan theke continue koro.",
    "en": "Continue the story from where it stopped, in the same style.",
}


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


def short_draft(chunk: str) -> str:
    """The opening sentences of a chunk, cut on a sentence boundary, at most SHORT_DRAFT_CHARS long."""
    sentences = re.findall(r"[^।?!.\n]+[।?!.]*\s*", chunk) or [chunk]
    draft = ""
    for s in sentences:
        if draft and len(draft) + len(s) > SHORT_DRAFT_CHARS:
            break
        draft += s
    return draft.strip() or chunk[:SHORT_DRAFT_CHARS].strip()


def build_sample(turns: list[dict]) -> dict:
    """One training conversation. The last turn is the assistant reply the model learns from."""
    last_user = next(t["content"] for t in reversed(turns) if t["role"] == "user")
    return {
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, *turns],
        "instruction": last_user,
        "input": "",
        "output": turns[-1]["content"],
    }


def story_to_samples(title: str, text: str, story_index: int = 0) -> list[dict]:
    clean_title = title.strip() or "গল্প"
    chunks = chunk_story(text)
    if not chunks:
        return []
    samples = []

    # Every story gets a Bengali write sample; the other phrasings rotate so the dataset stays balanced.
    samples.append(build_sample([
        {"role": "user", "content": WRITE_INSTRUCTIONS["bn"](clean_title)},
        {"role": "assistant", "content": chunks[0]},
    ]))
    alt_lang = LANGS[(story_index + 1) % len(LANGS)]
    if alt_lang != "bn":
        samples.append(build_sample([
            {"role": "user", "content": WRITE_INSTRUCTIONS[alt_lang](clean_title)},
            {"role": "assistant", "content": chunks[0]},
        ]))

    # Expand: the model sees its own short draft, then the request to grow it.
    draft = short_draft(chunks[0])
    if len(draft) < len(chunks[0]):
        lang = LANGS[story_index % len(LANGS)]
        samples.append(build_sample([
            {"role": "user", "content": SHORT_INSTRUCTIONS[lang](clean_title)},
            {"role": "assistant", "content": draft},
            {"role": "user", "content": EXPAND_INSTRUCTIONS[lang]},
            {"role": "assistant", "content": chunks[0]},
        ]))

    # Continue: a real conversation where the previous chunk's ending is the assistant's last turn.
    for i in range(1, len(chunks)):
        previous = chunks[i - 1]
        context = f"…{previous[-CONTEXT_CHARS * 2:]}" if len(previous) > CONTEXT_CHARS * 2 else previous
        lang = LANGS[(story_index + i) % len(LANGS)]
        samples.append(build_sample([
            {"role": "user", "content": WRITE_INSTRUCTIONS["bn"](clean_title)},
            {"role": "assistant", "content": context},
            {"role": "user", "content": CONTINUE_INSTRUCTIONS[lang]},
            {"role": "assistant", "content": chunks[i]},
        ]))
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
    for index, s in enumerate(stories):
        all_samples.extend(story_to_samples(s.get("title", ""), s["text"], index))

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
