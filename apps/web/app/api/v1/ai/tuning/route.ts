import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getTuningStatus, isVertexTuningConfigured, startTuning } from "@/lib/vertex-tuning";

export const dynamic = "force-dynamic";

function getAccountId(req: NextRequest): string {
  return req.headers.get("x-account-id") || "default_local_author";
}

function notConfigured() {
  return NextResponse.json(
    {
      configured: false,
      detail:
        "Cloud training is not configured on this server (GOOGLE_CLOUD_PROJECT, GCS_BUCKET, GOOGLE_SERVICE_ACCOUNT_JSON).",
    },
    { status: 503 },
  );
}

// Starting a job costs money, and account IDs are not authenticated, so starts require a shared key
function hasValidTuningKey(req: NextRequest): boolean {
  const expected = process.env.TUNING_ACCESS_KEY || "";
  const given = req.headers.get("x-tuning-key") || "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!isVertexTuningConfigured()) return notConfigured();
  try {
    const state = await getTuningStatus(getAccountId(req));
    return NextResponse.json({ configured: true, ...state });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not load training status";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isVertexTuningConfigured()) return notConfigured();
  if (!process.env.TUNING_ACCESS_KEY) {
    return NextResponse.json(
      { detail: "Cloud training is locked: set TUNING_ACCESS_KEY on the server." },
      { status: 503 },
    );
  }
  if (!hasValidTuningKey(req)) {
    return NextResponse.json({ detail: "Wrong or missing training access key." }, { status: 401 });
  }
  try {
    const state = await startTuning(getAccountId(req));
    return NextResponse.json({ configured: true, ...state });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not start training";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
