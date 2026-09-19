import { NextRequest, NextResponse } from "next/server";
import { resetAIMemory } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let accountId =
      req.headers.get("x-account-id") ||
      req.nextUrl.searchParams.get("account_id") ||
      "";

    if (!accountId) {
      try {
        const body = await req.json();
        accountId = body.account_id || "";
      } catch {
        // no body
      }
    }
    if (!accountId) accountId = "default_local_author";

    const authHeader = req.headers.get("authorization");
    const pyHeaders: Record<string, string> = {};
    if (authHeader) pyHeaders["Authorization"] = authHeader;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      await fetch(
        `http://127.0.0.1:8000/api/v1/ai/reset`,
        {
          method: "POST",
          headers: pyHeaders,
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
    } catch {
      // ignore python error
    }


    const res = resetAIMemory(accountId);
    return NextResponse.json(res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reset failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
