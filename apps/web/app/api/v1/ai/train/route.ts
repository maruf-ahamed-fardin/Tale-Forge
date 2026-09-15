import { NextRequest, NextResponse } from "next/server";
import { trainOnText } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, title } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { detail: "Text is required for training." },
        { status: 400 },
      );
    }

    // Try sending to Python backend if reachable
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const pyRes = await fetch("http://127.0.0.1:8000/api/v1/ai/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, title: title || "Trained Story" }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (pyRes.ok) {
        const data = await pyRes.json();
        // Also keep local engine memory in sync
        try {
          trainOnText(text, title);
        } catch {
          // ignore
        }
        return NextResponse.json(data);
      }
    } catch {
      // Python backend unreachable; proceed with embedded engine
    }

    const result = trainOnText(text, title);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Training failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
