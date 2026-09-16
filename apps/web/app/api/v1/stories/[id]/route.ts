import { NextRequest, NextResponse } from "next/server";
import {
  deleteSavedStory,
  getSavedStory,
  updateSavedStory,
} from "@/lib/saved-stories";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const story = getSavedStory(id);
  if (!story) {
    return NextResponse.json({ detail: "Story not found" }, { status: 404 });
  }
  return NextResponse.json(story);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = updateSavedStory(id, body);
    if (!updated) {
      return NextResponse.json({ detail: "Story not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update story";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const deleted = deleteSavedStory(id);
  if (!deleted) {
    return NextResponse.json({ detail: "Story not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
