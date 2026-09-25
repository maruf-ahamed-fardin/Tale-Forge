// Used for every training sample AND at inference time, so the fine-tuned model sees the same framing.
// Keep in sync with ai/data_pipeline/export_dataset.py and ai/inference/local_provider.py.
export const TRAINING_SYSTEM_PROMPT = [
  "You are TaleForge AI, an expert literary novelist specializing in Bengali literature.",
  "Follow the user's latest instruction exactly. If they ask to expand, continue, shorten, rewrite or change",
  "the previous story, work on that story from the conversation and keep its title, characters and events.",
  "Otherwise write a new story. Write in Bengali unless the user asks for English.",
].join(" ");

/** One turn of a chat, as sent to every model (local LoRA, tuned Gemini, Gemini API). */
export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

// How much of the conversation a model sees: the last N turns, with long stories trimmed.
export const MAX_HISTORY_TURNS = 6;
export const MAX_HISTORY_CHARS = 4000;

/**
 * Builds the conversation a model receives: recent history plus the new user message.
 * The latest assistant story is kept whole (up to MAX_HISTORY_CHARS) so "make it longer" has something to work on.
 */
export function buildConversation(history: ConversationTurn[], prompt: string): ConversationTurn[] {
  const recent = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({
      role: m.role,
      content: m.content.length > MAX_HISTORY_CHARS ? `${m.content.slice(0, MAX_HISTORY_CHARS)}…` : m.content,
    }));
  // Chat templates expect alternating turns starting with the user
  while (recent.length && recent[0].role !== "user") recent.shift();
  return [...recent, { role: "user", content: prompt }];
}

/** True when the message is about the previous story (expand, continue, edit) rather than a request for a new one. */
export function isFollowUpInstruction(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return (
    /\b(aro|arow|r)\b.*\b(boro|baro|lomba|bistarito|details?)\b|\b(boro|baro|lomba)\b.*\b(kor|koro|kore|korte)\b/.test(p) ||
    /\b(continue|expand|extend|longer|lengthen|shorten|shorter|rewrite|rephrase|edit|change|modify|improve|fix)\b/.test(p) ||
    /\b(ei|eta|oita|ager|age r|agerta|last|previous|upore r|uporer)\b.*\b(story|golpo|golpota|ta)\b/.test(p) ||
    /\b(chaliye|chalie|egiye|barao|bariye|badlao|bodlao|bodle|thik koro|choto koro)\b/.test(p) ||
    /আরও|আরো|বড়\s*কর|বাড়াও|বাড়িয়ে|চালিয়ে|এগিয়ে\s*নাও|বদলাও|বদলে|ছোট\s*কর|সংক্ষেপ|আগের\s*গল্প|এই\s*গল্প|গল্পটা|গল্পটি|ঠিক\s*কর|যোগ\s*কর/.test(prompt)
  );
}
