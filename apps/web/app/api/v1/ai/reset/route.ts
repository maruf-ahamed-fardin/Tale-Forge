import { NextResponse } from "next/server";
import { resetAIMemory } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      await fetch("http://127.0.0.1:8000/api/v1/ai/reset", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch {
      // ignore python error
    }

    const res = resetAIMemory();
    return NextResponse.json(res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reset failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
