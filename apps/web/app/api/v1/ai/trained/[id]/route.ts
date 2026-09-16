import { NextRequest, NextResponse } from "next/server";
import { deleteTrainedStory } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ detail: "Missing story id" }, { status: 400 });
    }
    const updatedStatus = deleteTrainedStory(id);
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
