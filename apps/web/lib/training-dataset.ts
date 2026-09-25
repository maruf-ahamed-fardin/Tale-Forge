import { getAccountPersonalStories, type TrainedStory } from "@/lib/story-engine";

// Used for every training sample AND at inference time, so the fine-tuned model sees the same framing.
// Keep in sync with ai/data_pipeline/export_dataset.py and ai/inference/local_provider.py.
export const TRAINING_SYSTEM_PROMPT =
  "You are TaleForge AI, an expert literary novelist specializing in Bengali literature.";

// Stories written by Gemini / the template engine are saved with this title prefix.
// They are not the user's own voice, so they are excluded from fine-tuning.
const AUTO_TRAINED_PREFIX = "Auto-Trained:";

export interface ChunkOptions {
  maxChunkChars: number;
  contextChars: number;
}

// Local Qwen LoRA: Qwen2.5 uses ~1.1 tokens per Bengali character. A 650-char chunk (~720 tokens)
// plus the prompt and 150 chars of context (~260 tokens) stays under the 1024-token training limit.
export const LOCAL_LORA_CHUNKS: ChunkOptions = { maxChunkChars: 650, contextChars: 150 };

// Gemini tuning has a far larger context window; bigger chunks keep more of each story's flow.
export const GEMINI_TUNING_CHUNKS: ChunkOptions = { maxChunkChars: 1500, contextChars: 300 };

export interface TrainingSample {
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

/** Turns stories into instruction → story-chunk pairs: the first chunk from the title, the rest as continuations. */
export function buildTrainingSamples(stories: TrainedStory[], options: ChunkOptions): TrainingSample[] {
  const samples: TrainingSample[] = [];
  for (const s of stories) {
    const title = s.title.trim() || "গল্প";
    const chunks = chunkStory(s.text, options.maxChunkChars);
    chunks.forEach((chunk, i) => {
      if (i === 0) {
        samples.push({
          instruction: `'${title}' শিরোনামে একটি সাহিত্যিক বাংলা গল্প রচনা করো।`,
          output: chunk,
        });
      } else {
        const context = chunks[i - 1].slice(-options.contextChars);
        samples.push({
          instruction: `'${title}' গল্পটি নিচের অংশ থেকে একই ধারায় এগিয়ে নাও:\n\n"${context}"`,
          output: chunk,
        });
      }
    });
  }
  return samples;
}
