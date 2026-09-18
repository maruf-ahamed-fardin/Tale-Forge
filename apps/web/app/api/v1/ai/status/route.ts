import { NextRequest, NextResponse } from "next/server";
import { getAIStatus } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const accountId =
    req.headers.get("x-account-id") ||
    req.nextUrl.searchParams.get("account_id") ||
    "default_local_author";

  // Try proxying to Python backend if running
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const pyRes = await fetch(
      `http://127.0.0.1:8000/api/v1/ai/status?account_id=${encodeURIComponent(accountId)}`,
      {
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);
    if (pyRes.ok) {
      const data = await pyRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Python backend not running or timed out; fall back to embedded story engine
  }

  const status = getAIStatus(accountId);
  return NextResponse.json(status);
}
