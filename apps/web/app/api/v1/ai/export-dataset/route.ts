import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 1. Locate memory file
    const rootDir = path.resolve(process.cwd(), "..", "..");
    const memoryFile = path.join(rootDir, "storage", "ai_model_memory.json");
    const datasetsDir = path.join(rootDir, "data", "datasets");

    if (!fs.existsSync(datasetsDir)) {
      fs.mkdirSync(datasetsDir, { recursive: true });
    }

    let stories: Array<{ title: string; text: string }> = [];
    if (fs.existsSync(memoryFile)) {
      try {
        const raw = fs.readFileSync(memoryFile, "utf-8");
        const parsed = JSON.parse(raw);
        stories = parsed.trained_stories || [];
      } catch {
        // ignore
      }
    }

    if (stories.length === 0) {
      stories = [
        {
          title: "বৃষ্টির দিনে ফেলে আসা স্মৃতি",
          text: "শ্রাবণের মেঘলা আকাশে গুঁড়ি গুঁড়ি বৃষ্টি পড়ছিল। পুরনো বারান্দার গ্রিলে হাত রেখে অনিন্দিতা দূর আকাশের দিকে তাকিয়ে ছিল। বাতাসে ভেসে আসছিল ভেজা মাটির চিরচেনা গন্ধ।",
        },
      ];
    }

    const trainPath = path.join(datasetsDir, "train.jsonl");
    const valPath = path.join(datasetsDir, "val.jsonl");

    const lines: string[] = [];
    for (const s of stories) {
      if (!s.text) continue;
      const cleanTitle = s.title.replace("Auto-Trained:", "").trim() || "গল্প";
      const item = {
        messages: [
          {
            role: "system",
            content: "You are TaleForge AI, an expert literary novelist specializing in Bengali literature.",
          },
          {
            role: "user",
            content: `'${cleanTitle}' শিরোনামে একটি সাহিত্যিক বাংলা গল্প রচনা করো।`,
          },
          {
            role: "assistant",
            content: s.text,
          },
        ],
        instruction: `'${cleanTitle}' শিরোনামে একটি সাহিত্যিক বাংলা গল্প রচনা করো।`,
        input: "",
        output: s.text,
      };
      lines.push(JSON.stringify(item));
    }

    fs.writeFileSync(trainPath, lines.join("\n") + "\n", "utf-8");
    fs.writeFileSync(valPath, lines.slice(0, 2).join("\n") + "\n", "utf-8");

    return NextResponse.json({
      success: true,
      message: `Successfully exported ${lines.length} training samples to train.jsonl!`,
      total_stories: stories.length,
      total_samples: lines.length,
      train_path: trainPath,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
