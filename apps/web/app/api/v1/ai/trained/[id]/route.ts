import { NextRequest, NextResponse } from "next/server";
import { deleteTrainedStory } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const accountId =
      req.headers.get("x-account-id") ||
      req.nextUrl.searchParams.get("account_id") ||
      "default_local_author";

    if (!id) {
      return NextResponse.json({ detail: "Missing story id" }, { status: 400 });
    }

    // Try proxying to Python backend if alive
    const authHeader = req.headers.get("authorization");
    const pyHeaders: Record<string, string> = {};
    if (authHeader) pyHeaders["Authorization"] = authHeader;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const pyRes = await fetch(
        `http://127.0.0.1:8000/api/v1/ai/trained/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: pyHeaders,
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      if (pyRes.ok) {
        const data = await pyRes.json();
        try {
          await deleteTrainedStory(id, accountId);
        } catch {
          // ignore
        }
        return NextResponse.json(data);
      }
    } catch {
      // ignore
    }

    const updatedStatus = await deleteTrainedStory(id, accountId);
    return NextResponse.json({
      success: true,
      message: "Trained story removed from model memory.",
      status: updatedStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete story";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
