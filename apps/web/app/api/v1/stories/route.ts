import { NextRequest, NextResponse } from "next/server";
import { createSavedStory, listSavedStories } from "@/lib/saved-stories";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Proxy to Python backend if auth token present and backend is alive
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const pyRes = await fetch("http://127.0.0.1:8000/api/v1/stories", {
        headers: { Authorization: authHeader },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (pyRes.ok) {
        const data = await pyRes.json();
        return NextResponse.json(data);
      }
    } catch {
      // ignore
    }
  }

  try {
    const data = await listSavedStories();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load stories";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Try proxying to Python backend if auth token present
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const pyRes = await fetch("http://127.0.0.1:8000/api/v1/stories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (pyRes.ok) {
          const data = await pyRes.json();
          // Also mirror in local storage
          try {
            await createSavedStory(body);
          } catch {
            // ignore
          }
          return NextResponse.json(data, { status: 201 });
        }
      } catch {
        // ignore
      }
    }

    const story = await createSavedStory(body);
    return NextResponse.json(story, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save story";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
