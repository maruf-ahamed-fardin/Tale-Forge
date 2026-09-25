import { NextRequest, NextResponse } from "next/server";
import { generateStoryAndChat } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

/**
 * Story Studio generation. Turns the studio form into a prompt and runs it through the same
 * story engine as chat (the user's TaleForge LoRA model by default), so it needs no backend
 * login, no database, and works wherever the web app is deployed.
 *
 * Same request/response shape as the FastAPI /api/v1/generate endpoint it replaces.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const language = body.language === "en" ? "en" : "bn";
    const model = typeof body.model === "string" && body.model ? body.model : "taleforge-lora";
    const accountId = body.account_id || req.headers.get("x-account-id") || "default_local_author";
    const customApiKey = req.headers.get("x-gemini-key") || process.env.GEMINI_API_KEY || "";

    const prompt = buildStudioPrompt(body, language);

    const result = await generateStoryAndChat(
      prompt,
      false, // a studio draft is not training data until the author saves it
      customApiKey,
      undefined,
      model,
      "default",
      "hybrid",
      accountId,
      [], // fresh story: no chat history
    );

    const text = result.story.trim();
    return NextResponse.json({
      text,
      word_count: text.split(/\s+/).filter(Boolean).length,
      provider: result.model,
      finish_reason: "stop",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

const LENGTH_HINTS: Record<string, { bn: string; en: string }> = {
  Short: { bn: "ছোট গল্প, প্রায় ৩০০ শব্দ।", en: "A short story of about 300 words." },
  Medium: { bn: "মাঝারি দৈর্ঘ্যের গল্প, প্রায় ৬০০ শব্দ।", en: "A medium-length story of about 600 words." },
  Long: { bn: "দীর্ঘ গল্প, প্রায় ১০০০ শব্দ বা বেশি।", en: "A long story of 1000 words or more." },
};

function clean(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Builds one clear instruction from the studio's creative-direction fields. */
function buildStudioPrompt(body: Record<string, unknown>, language: "bn" | "en"): string {
  const title = clean(body.title, 120);
  const genre = clean(body.genre, 40);
  const mood = clean(body.mood, 40);
  const setting = clean(body.setting, 500);
  const name = clean(body.character_name, 80);
  const role = clean(body.character_role, 120);
  const traits = clean(body.character_traits, 300);
  const extra = clean(body.prompt, 1000);
  const length = LENGTH_HINTS[clean(body.length_preset, 20)] || LENGTH_HINTS.Medium;

  const hasTitle = title && title.toLowerCase() !== "untitled story";
  const lines: string[] = [];

  if (language === "en") {
    // "write in english" is the phrase the story engine recognises as an explicit English request
    lines.push(hasTitle ? `Write in English a story titled "${title}".` : "Write in English a new story.");
    if (genre) lines.push(`Genre: ${genre}.`);
    if (mood) lines.push(`Mood: ${mood}.`);
    if (setting) lines.push(`Setting / premise: ${setting}`);
    if (name || role || traits) {
      lines.push(`Main character: ${[name, role, traits].filter(Boolean).join(", ")}.`);
    }
    if (extra) lines.push(extra);
    lines.push(length.en);
    lines.push("Start with a title line, then the story in paragraphs.");
  } else {
    lines.push(hasTitle ? `"${title}" শিরোনামে একটি সাহিত্যিক বাংলা গল্প রচনা করো।` : "একটি নতুন সাহিত্যিক বাংলা গল্প রচনা করো।");
    if (genre) lines.push(`ধরন: ${genre}।`);
    if (mood) lines.push(`মেজাজ: ${mood}।`);
    if (setting) lines.push(`পটভূমি: ${setting}`);
    if (name || role || traits) {
      lines.push(`প্রধান চরিত্র: ${[name, role, traits].filter(Boolean).join(", ")}।`);
    }
    if (extra) lines.push(extra);
    lines.push(length.bn);
    lines.push("প্রথমে শিরোনাম, তারপর অনুচ্ছেদে গল্প।");
  }
  return lines.join("\n");
}
