import { NextRequest, NextResponse } from "next/server";
import { generateStoryAndChat } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message || body.prompt;
    const autoTrain = body.auto_train !== false;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { detail: "Message is required." },
        { status: 400 },
      );
    }

    const customApiKey =
      req.headers.get("x-gemini-key") || process.env.GEMINI_API_KEY || "";

    // If Python backend is available AND no custom client key was sent, try python backend
    if (!customApiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const pyRes = await fetch("http://127.0.0.1:8000/api/v1/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, auto_train: autoTrain }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (pyRes.ok) {
          const data = await pyRes.json();
          return NextResponse.json(data);
        }
      } catch {
        // Python backend not running or timed out; fall through to embedded engine
      }
    }

    // Execute with embedded AI Story Engine (supports Gemini API + smart Bengali narrative synthesis)
    const result = await generateStoryAndChat(message, autoTrain, customApiKey);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
