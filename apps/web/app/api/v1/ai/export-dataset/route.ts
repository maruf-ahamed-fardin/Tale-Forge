import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  LOCAL_LORA_CHUNKS,
  TRAINING_SYSTEM_PROMPT,
  buildTrainingSamples,
  countWords,
  getOwnStories,
} from "@/lib/training-dataset";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const accountId = req.headers.get("x-account-id") || "default_local_author";
    const stories = getOwnStories(accountId);

    if (stories.length === 0) {
      return NextResponse.json(
        {
          detail:
            "এই অ্যাকাউন্টে আপনার নিজের লেখা কোনো গল্প পাওয়া যায়নি। আগে Train AI পাতায় আপনার গল্প যোগ করুন। (No stories of your own found for this account. Add your stories on the Train AI page first.)",
        },
        { status: 400 },
      );
    }

    // ChatML + Alpaca fields, as read by ai/training/train_lora.py and the Colab notebook
    const samples = buildTrainingSamples(stories, LOCAL_LORA_CHUNKS).map((s) => ({
      messages: [
        { role: "system", content: TRAINING_SYSTEM_PROMPT },
        { role: "user", content: s.instruction },
        { role: "assistant", content: s.output },
      ],
      instruction: s.instruction,
      input: "",
      output: s.output,
    }));

    // Hold out ~10% for validation only when there is enough data to spare
    const valCount = samples.length >= 10 ? Math.floor(samples.length * 0.1) : 0;
    const trainSamples = samples.slice(0, samples.length - valCount);
    const valSamples = samples.slice(samples.length - valCount);

    const rootDir = path.resolve(process.cwd(), "..", "..");
    const datasetsDir = path.join(rootDir, "data", "datasets");
    fs.mkdirSync(datasetsDir, { recursive: true });

    const trainPath = path.join(datasetsDir, "train.jsonl");
    const valPath = path.join(datasetsDir, "val.jsonl");
    const toJsonl = (items: unknown[]) =>
      items.map((item) => JSON.stringify(item)).join("\n") + (items.length ? "\n" : "");

    fs.writeFileSync(trainPath, toJsonl(trainSamples), "utf-8");
    fs.writeFileSync(valPath, toJsonl(valSamples), "utf-8");

    const totalWords = countWords(stories);

    return NextResponse.json({
      success: true,
      message: `Exported ${trainSamples.length} training samples from ${stories.length} of your stories (${totalWords} words) to train.jsonl.`,
      account_id: accountId,
      total_stories: stories.length,
      total_words: totalWords,
      train_samples: trainSamples.length,
      val_samples: valSamples.length,
      train_path: trainPath,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
