import { getAccountPersonalStories, type TrainedStory } from "@/lib/story-engine";
import { TRAINING_SYSTEM_PROMPT } from "@/lib/system-prompt";

export { TRAINING_SYSTEM_PROMPT };

// Stories written by Gemini / the template engine are saved with this title prefix.
// They are not the user's own voice, so they are excluded from fine-tuning.
const AUTO_TRAINED_PREFIX = "Auto-Trained:";

export interface ChunkOptions {
  maxChunkChars: number;
  contextChars: number;
}

// Local Qwen LoRA: Qwen2.5 uses ~1.1 tokens per Bengali character. A 650-char chunk (~720 tokens)
// plus the multi-turn prompt (short draft + instruction, ~450 tokens) stays under the 1792-token training limit.
export const LOCAL_LORA_CHUNKS: ChunkOptions = { maxChunkChars: 650, contextChars: 150 };

// Gemini tuning has a far larger context window; bigger chunks keep more of each story's flow.
export const GEMINI_TUNING_CHUNKS: ChunkOptions = { maxChunkChars: 1500, contextChars: 300 };

// A "short draft" is the opening of a story; the expand sample teaches the model to grow it into the full chunk.
const SHORT_DRAFT_CHARS = 260;

export interface TrainingTurn {
  role: "user" | "assistant";
  content: string;
}

/** One training conversation. The last turn is always the assistant reply the model learns from. */
export interface TrainingSample {
  messages: TrainingTurn[];
  /** Alpaca compatibility: the last user instruction and the assistant reply. */
  instruction: string;
  output: string;
}

/** The account's own stories — excludes auto-generated ones. */
export async function getOwnStories(accountId: string): Promise<TrainedStory[]> {
  return (await getAccountPersonalStories(accountId)).filter(
    (s) => s.text?.trim() && !s.title.startsWith(AUTO_TRAINED_PREFIX),
  );
}

export function countWords(stories: TrainedStory[]): number {
  return stories.reduce((acc, s) => acc + s.text.split(/\s+/).filter(Boolean).length, 0);
}

function chunkStory(text: string, maxChunkChars: number): string[] {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Split oversized paragraphs on sentence boundaries (। ? !)
  const pieces: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= maxChunkChars) {
      pieces.push(p);
      continue;
    }
    const sentences = p.match(/[^।?!]+[।?!]*\s*/g) || [p];
    let buf = "";
    for (const s of sentences) {
      if (buf && buf.length + s.length > maxChunkChars) {
        pieces.push(buf.trim());
        buf = "";
      }
      buf += s;
    }
    if (buf.trim()) pieces.push(buf.trim());
  }

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > maxChunkChars) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${piece}` : piece;
  }
  if (current) chunks.push(current);
  return chunks;
}

/** The opening sentences of a chunk, cut on a sentence boundary, at most SHORT_DRAFT_CHARS long. */
function shortDraft(chunk: string): string {
  const sentences = chunk.match(/[^।?!.\n]+[।?!.]*\s*/g) || [chunk];
  let draft = "";
  for (const s of sentences) {
    if (draft && draft.length + s.length > SHORT_DRAFT_CHARS) break;
    draft += s;
  }
  return draft.trim() || chunk.slice(0, SHORT_DRAFT_CHARS).trim();
}

// The same request phrased in Bengali, Banglish and English, so the model obeys all three.
// Keep in sync with the INSTRUCTION_* lists in ai/data_pipeline/export_dataset.py.
const WRITE_INSTRUCTIONS = {
  bn: (title: string) => `'${title}' শিরোনামে একটি সাহিত্যিক বাংলা গল্প রচনা করো।`,
  banglish: (title: string) => `'${title}' name e ekta shundor bangla golpo lekho.`,
  en: (title: string) => `Write a literary Bengali story titled '${title}'.`,
};

const SHORT_INSTRUCTIONS = {
  bn: (title: string) => `'${title}' শিরোনামে একটি ছোট গল্প লেখো, কয়েক লাইনে।`,
  banglish: (title: string) => `'${title}' name e ekta choto golpo lekho, koyek line e.`,
  en: (title: string) => `Write a very short story titled '${title}', just a few lines.`,
};

const EXPAND_INSTRUCTIONS = {
  bn: "এই গল্পটা আরও বড় করো। একই শিরোনাম, চরিত্র আর ঘটনা রেখে বিস্তারিতভাবে লেখো।",
  banglish: "ei golpo ta aro boro koro. same title, character ar ghotona rekhe details e lekho.",
  en: "Make this story longer. Keep the same title, characters and events, and write it in detail.",
};

const CONTINUE_INSTRUCTIONS = {
  bn: "গল্পটা যেখানে শেষ হয়েছে সেখান থেকে একই ধারায় চালিয়ে যাও।",
  banglish: "golpo ta jekhane shesh hoyeche shekhan theke continue koro.",
  en: "Continue the story from where it stopped, in the same style.",
};

const LANGS = ["bn", "banglish", "en"] as const;

function sample(messages: TrainingTurn[]): TrainingSample {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastAssistant = messages[messages.length - 1];
  return { messages, instruction: lastUser?.content || "", output: lastAssistant.content };
}

/**
 * Turns stories into training conversations:
 *  - write:    "write a story titled X" → first chunk (instruction rotated through Bengali, Banglish, English)
 *  - expand:   short draft → "make it longer" → full first chunk (teaches follow-up instructions)
 *  - continue: previous chunk's ending → "continue" → next chunk, as a real multi-turn conversation
 */
export function buildTrainingSamples(stories: TrainedStory[], options: ChunkOptions): TrainingSample[] {
  const samples: TrainingSample[] = [];
  stories.forEach((story, storyIndex) => {
    const title = story.title.trim() || "গল্প";
    const chunks = chunkStory(story.text, options.maxChunkChars);
    if (chunks.length === 0) return;

    // Every story gets a Bengali write sample; the other phrasings rotate so the dataset stays balanced.
    const altLang = LANGS[(storyIndex + 1) % LANGS.length];
    samples.push(sample([{ role: "user", content: WRITE_INSTRUCTIONS.bn(title) }, { role: "assistant", content: chunks[0] }]));
    if (altLang !== "bn") {
      samples.push(
        sample([{ role: "user", content: WRITE_INSTRUCTIONS[altLang](title) }, { role: "assistant", content: chunks[0] }]),
      );
    }

    // Expand: the model sees its own short draft, then the request to grow it.
    const draft = shortDraft(chunks[0]);
    if (draft.length < chunks[0].length) {
      const lang = LANGS[storyIndex % LANGS.length];
      samples.push(
        sample([
          { role: "user", content: SHORT_INSTRUCTIONS[lang](title) },
          { role: "assistant", content: draft },
          { role: "user", content: EXPAND_INSTRUCTIONS[lang] },
          { role: "assistant", content: chunks[0] },
        ]),
      );
    }

    // Continue: a real conversation where the previous chunk's ending is the assistant's last turn.
    for (let i = 1; i < chunks.length; i++) {
      const previous = chunks[i - 1];
      const context = previous.length > options.contextChars * 2 ? `…${previous.slice(-options.contextChars * 2)}` : previous;
      const lang = LANGS[(storyIndex + i) % LANGS.length];
      samples.push(
        sample([
          { role: "user", content: WRITE_INSTRUCTIONS.bn(title) },
          { role: "assistant", content: context },
          { role: "user", content: CONTINUE_INSTRUCTIONS[lang] },
          { role: "assistant", content: chunks[i] },
        ]),
      );
    }
  });
  return samples;
}
