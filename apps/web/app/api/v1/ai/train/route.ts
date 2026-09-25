import { NextRequest, NextResponse } from "next/server";
import { trainOnText } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, title } = body;
    const accountId =
      body.account_id ||
      req.headers.get("x-account-id") ||
      "default_local_author";

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { detail: "Text is required for training." },
        { status: 400 },
      );
    }

    // Try sending to Python backend if reachable
    const authHeader = req.headers.get("authorization");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const pyHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (authHeader) pyHeaders["Authorization"] = authHeader;

      const pyRes = await fetch("http://127.0.0.1:8000/api/v1/ai/train", {
        method: "POST",
        headers: pyHeaders,
        body: JSON.stringify({
          text,
          title: title || "Trained Story",
          account_id: accountId,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (pyRes.ok) {
        const data = await pyRes.json();
        // Also keep local engine memory in sync
        try {
          await trainOnText(text, title, accountId);
        } catch {
          // ignore
        }
        return NextResponse.json(data);
      }
    } catch {
      // Python backend unreachable; proceed with embedded engine
    }

    const result = await trainOnText(text, title, accountId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Training failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
