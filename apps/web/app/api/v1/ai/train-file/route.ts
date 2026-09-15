import { NextRequest, NextResponse } from "next/server";
import { trainOnText } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const title = (formData.get("title") as string) || "";

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { detail: "No valid file uploaded." },
        { status: 400 },
      );
    }

    const fileObj = file as File;
    const text = await fileObj.text();

    if (!text.trim()) {
      return NextResponse.json(
        { detail: "The uploaded file is empty." },
        { status: 400 },
      );
    }

    const storyTitle = title.trim() || fileObj.name || "Uploaded Story";

    // Try proxying to Python backend if active
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const forwardForm = new FormData();
      forwardForm.append("file", fileObj);
      forwardForm.append("title", storyTitle);

      const pyRes = await fetch("http://127.0.0.1:8000/api/v1/ai/train-file", {
        method: "POST",
        body: forwardForm,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (pyRes.ok) {
        const data = await pyRes.json();
        try {
          trainOnText(text, storyTitle);
        } catch {
          // ignore
        }
        return NextResponse.json(data);
      }
    } catch {
      // Fall back to embedded engine
    }

    const result = trainOnText(text, storyTitle);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "File training failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
