import { NextRequest, NextResponse } from "next/server";
import { generateStoryAndChat, type ConversationTurn } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message || body.prompt || "";
    const autoTrain = body.auto_train !== false;
    const imageBase64 = body.image_base64;
    const imageType = body.image_type || "image/jpeg";
    const model = body.model || "taleforge-lora";
    // The conversation as the client shows it, so follow-ups ("make it longer") apply to the right story
    const history: ConversationTurn[] | undefined = Array.isArray(body.history)
      ? body.history
          .filter(
            (m: { role?: string; content?: string }) =>
              (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string",
          )
          .map((m: ConversationTurn) => ({ role: m.role, content: m.content }))
      : undefined;
    const persona = body.persona || "default";
    const trainingScope = body.training_scope || "hybrid";
    const accountId =
      body.account_id ||
      req.headers.get("x-account-id") ||
      "default_local_author";

    if (!message.trim() && !imageBase64) {
      return NextResponse.json(
        { detail: "Message or image is required." },
        { status: 400 },
      );
    }

    const customApiKey =
      req.headers.get("x-gemini-key") || process.env.GEMINI_API_KEY || "";

    const image = imageBase64
      ? { base64: imageBase64, mimeType: imageType }
      : undefined;

    // Execute with embedded AI Story Engine (supports Gemini Vision API + smart Bengali narrative synthesis)
    const result = await generateStoryAndChat(
      message,
      autoTrain,
      customApiKey,
      image,
      model,
      persona,
      trainingScope,
      accountId,
      history,
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
