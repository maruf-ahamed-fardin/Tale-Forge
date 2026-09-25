"""TaleForge Bootstrap Dataset Builder

Builds a starter training set before the author has written enough stories of their own.
It reuses the Bengali literary text that already ships with the web app (apps/web/lib/story-engine.ts):

  - the six default "master literature" stories
  - the template engine's paragraph pools (openings / developments / climaxes / endings per theme),
    composed into many distinct short stories with the same recipe the offline engine uses

Every story then goes through the same multi-turn sample builder as the author's own stories
(write / expand / continue, in Bengali, Banglish and English), so the adapter learns to FOLLOW
instructions such as "ei golpo ta aro boro koro" as well as the house style.

The author's own stories (from a personal_training JSON) are merged in when --account / --memory is given.
Re-run this whenever more stories are added; the author's voice takes over as their share grows.

Usage:
    python ai/data_pipeline/bootstrap_dataset.py
    python ai/data_pipeline/bootstrap_dataset.py --per-theme 10 --account default_local_author
"""

import argparse
import json
import random
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:  # so it runs as `python ai/data_pipeline/bootstrap_dataset.py`
    sys.path.insert(0, str(REPO_ROOT))

from ai.data_pipeline.export_dataset import (  # noqa: E402
    AUTO_TRAINED_PREFIX,
    DEFAULT_ACCOUNT_ID,
    DEFAULT_OUTPUT_DIR,
    PERSONAL_TRAINING_DIR,
    sanitize_account_id,
    story_to_samples,
)

STORY_ENGINE_TS = REPO_ROOT / "apps" / "web" / "lib" / "story-engine.ts"

# Filled in for the template placeholders (the web engine derives these from the live prompt)
PROMPT_REF_PHRASES = [
    "মনের গভীরে বহুদিন ধরে জমে থাকা সেই অনুভূতিটি",
    "হৃদয়ের কোণে লুকিয়ে রাখা সেই না-বলা কথাটি",
    "স্মৃতির ভাঁজে সযত্নে রাখা সেই মুহূর্তটি",
]


def _backtick_strings(block: str) -> list[str]:
    return [m.replace("\\`", "`") for m in re.findall(r"`((?:[^`\\]|\\.)*)`", block, flags=re.S)]


def _quoted_strings(block: str) -> list[str]:
    return re.findall(r'"([^"\n]+)"', block)


def read_engine_source() -> str:
    if not STORY_ENGINE_TS.exists():
        raise SystemExit(f"Cannot find {STORY_ENGINE_TS}")
    return STORY_ENGINE_TS.read_text(encoding="utf-8")


def parse_default_stories(src: str) -> list[dict]:
    block = src[src.index("DEFAULT_TRAINED_STORIES"): src.index("interface AccountMemory")]
    titles = re.findall(r'title:\s*"([^"]*)"', block)
    texts = _backtick_strings(block)
    return [{"title": t, "text": x.strip()} for t, x in zip(titles, texts) if x.strip()]


def parse_names(src: str) -> tuple[list[str], list[str]]:
    block = src[src.index("const CHARACTER_NAMES"): src.index("function pickRandom")]
    male = _quoted_strings(block[block.index("male:"): block.index("female:")])
    female = _quoted_strings(block[block.index("female:"):])
    return male, female


def parse_titles(src: str) -> dict[str, list[str]]:
    start = src.index("const titlesByTheme")
    block = src[start: src.index("};", start)]
    titles: dict[str, list[str]] = {}
    for m in re.finditer(r"(\w+):\s*\[(.*?)\]", block, flags=re.S):
        titles[m.group(1)] = _quoted_strings(m.group(2))
    return titles


def parse_generators(src: str) -> dict[str, dict[str, list[str]]]:
    start = src.index("const generators")
    block = src[start: src.index("const selectedGen", start)]
    pools: dict[str, dict[str, list[str]]] = {}
    pattern = re.compile(
        r"(\w+):\s*\{\s*openings:\s*\[(.*?)\],\s*developments:\s*\[(.*?)\],\s*climaxes:\s*\[(.*?)\],\s*endings:\s*\[(.*?)\],?\s*\}",
        flags=re.S,
    )
    for m in pattern.finditer(block):
        pools[m.group(1)] = {
            "openings": _backtick_strings(m.group(2)),
            "developments": _backtick_strings(m.group(3)),
            "climaxes": _backtick_strings(m.group(4)),
            "endings": _backtick_strings(m.group(5)),
        }
    if not pools:
        raise SystemExit("Could not parse the template paragraph pools from story-engine.ts")
    return pools


def fill_placeholders(text: str, rng: random.Random, male: list[str], female: list[str]) -> str:
    hero, heroine = rng.choice(male), rng.choice(female)
    text = text.replace("${hero}", hero).replace("${heroine}", heroine)
    text = text.replace("${promptRef}", rng.choice(PROMPT_REF_PHRASES))
    text = text.replace("${styleAddition}", "")
    text = re.sub(r"\$\{[^}]*\}", "", text)  # anything unexpected
    return text.strip()


def compose_synthetic_stories(src: str, per_theme: int, seed: int) -> list[dict]:
    rng = random.Random(seed)
    male, female = parse_names(src)
    titles = parse_titles(src)
    pools = parse_generators(src)
    stories: list[dict] = []
    for theme, pool in pools.items():
        combos = [
            (o, d, c, e)
            for o in pool["openings"]
            for d in pool["developments"]
            for c in pool["climaxes"]
            for e in pool["endings"]
        ]
        rng.shuffle(combos)
        theme_titles = titles.get(theme) or titles.get("general") or ["গল্প"]
        for i, (o, d, c, e) in enumerate(combos[:per_theme]):
            # Names must be consistent within one story
            story_rng = random.Random(rng.random())
            hero, heroine = story_rng.choice(male), story_rng.choice(female)
            paragraphs = [
                fill_placeholders(p.replace("${hero}", hero).replace("${heroine}", heroine), story_rng, [hero], [heroine])
                for p in (o, d, c, e)
            ]
            title = theme_titles[i % len(theme_titles)]
            if i >= len(theme_titles):
                title = f"{title} ({i // len(theme_titles) + 1})"
            stories.append({"title": title, "text": "\n\n".join(paragraphs), "theme": theme})
    return stories


def load_own_stories(account_id: str, memory_file: Path | None) -> list[dict]:
    if memory_file is None:
        memory_file = PERSONAL_TRAINING_DIR / f"{sanitize_account_id(account_id)}.json"
    if not memory_file.exists():
        return []
    data = json.loads(memory_file.read_text(encoding="utf-8"))
    return [
        {"title": s.get("title", ""), "text": s["text"]}
        for s in data.get("trained_stories", [])
        if s.get("text", "").strip() and not s.get("title", "").startswith(AUTO_TRAINED_PREFIX)
    ]


def build(per_theme: int, account_id: str, memory_file: Path | None, output_dir: Path, seed: int) -> dict:
    src = read_engine_source()
    defaults = parse_default_stories(src)
    synthetic = compose_synthetic_stories(src, per_theme, seed)
    own = load_own_stories(account_id, memory_file)

    # The author's own stories come first and are never held out for validation
    stories = own + defaults + synthetic
    samples: list[dict] = []
    for index, s in enumerate(stories):
        samples.extend(story_to_samples(s["title"], s["text"], index))

    rng = random.Random(seed)
    own_samples = sum(len(story_to_samples(s["title"], s["text"], i)) for i, s in enumerate(own))
    rest = samples[own_samples:]
    rng.shuffle(rest)
    val_count = int(len(rest) * 0.1) if len(rest) >= 10 else 0
    train_data = samples[:own_samples] + rest[: len(rest) - val_count]
    val_data = rest[len(rest) - val_count:]
    rng.shuffle(train_data)

    output_dir.mkdir(parents=True, exist_ok=True)
    train_path, val_path = output_dir / "train.jsonl", output_dir / "val.jsonl"
    with open(train_path, "w", encoding="utf-8") as f:
        for item in train_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    with open(val_path, "w", encoding="utf-8") as f:
        for item in val_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    total_chars = sum(len(s["text"]) for s in stories)
    print("Bootstrap dataset written:")
    print(f"  - Author's own stories: {len(own)}")
    print(f"  - Default literature stories: {len(defaults)}")
    print(f"  - Synthetic template stories: {len(synthetic)} ({per_theme} per theme)")
    print(f"  - Total: {len(stories)} stories, {total_chars} characters")
    print(f"  - Training samples: {len(train_data)} -> {train_path}")
    print(f"  - Validation samples: {len(val_data)} -> {val_path}")
    return {
        "own_stories": len(own),
        "default_stories": len(defaults),
        "synthetic_stories": len(synthetic),
        "train_samples": len(train_data),
        "val_samples": len(val_data),
        "train_path": str(train_path),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build a starter TaleForge training dataset from the bundled Bengali text")
    parser.add_argument("--per-theme", type=int, default=8, help="Synthetic stories to compose per theme (8 themes)")
    parser.add_argument("--account", type=str, default=DEFAULT_ACCOUNT_ID, help="Account whose own stories to merge in")
    parser.add_argument("--memory", type=Path, default=None, help="Explicit personal training JSON to merge in")
    parser.add_argument("--outdir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Output directory for datasets")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    build(args.per_theme, args.account, args.memory, args.outdir, args.seed)
