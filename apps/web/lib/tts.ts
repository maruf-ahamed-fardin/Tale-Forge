/**
 * Browser text-to-speech helper built on the Web Speech API.
 *
 * Works around the usual reasons "Read aloud" silently does nothing:
 * - `getVoices()` is empty on the first call in Chromium until `voiceschanged` fires.
 * - Long utterances stop mid-way in Chromium; the text is split into short chunks.
 * - `cancel()` immediately followed by `speak()` drops the new utterance; a short delay is added.
 * - Utterances that are garbage-collected never fire `onend`; the handle keeps references.
 * - Bangla text spoken with a non-Bangla voice is silent; the utterance language is set
 *   from the text, and the caller is told whether a matching voice exists.
 */

export type TtsLang = "bn-BD" | "en-US";

export interface SpeakOptions {
  lang?: TtsLang;
  rate?: number;
  onEnd?: () => void;
}

export interface SpeakHandle {
  stop: () => void;
  /** True when a voice for the requested language was found. */
  voiceFound: boolean;
  /** Name of the voice used, when one was set explicitly. */
  voiceName: string | null;
}

export function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function detectSpeechLang(text: string): TtsLang {
  return /[ঀ-৿]/.test(text) ? "bn-BD" : "en-US";
}

let voicesCache: SpeechSynthesisVoice[] = [];

/** Resolves with the available voices, waiting for `voiceschanged` when the list is still empty. */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!hasSpeechSynthesis()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length > 0) {
    voicesCache = now;
    return Promise.resolve(now);
  }
  if (voicesCache.length > 0) return Promise.resolve(voicesCache);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener("voiceschanged", finish);
      voicesCache = synth.getVoices();
      resolve(voicesCache);
    };
    synth.addEventListener("voiceschanged", finish);
    setTimeout(finish, timeoutMs);
  });
}

function normalizeLang(lang: string): string {
  return lang.replace("_", "-").toLowerCase();
}

/** Best voice for a language: exact region match, then same language, then null. */
export function pickVoice(voices: SpeechSynthesisVoice[], lang: TtsLang): SpeechSynthesisVoice | null {
  const wanted = normalizeLang(lang);
  const base = wanted.split("-")[0];
  const exact = voices.find((v) => normalizeLang(v.lang) === wanted);
  if (exact) return exact;
  const sameLanguage = voices.filter((v) => normalizeLang(v.lang).split("-")[0] === base);
  if (sameLanguage.length === 0) return null;
  // Prefer local voices over network ones so playback starts without a round trip.
  return sameLanguage.find((v) => v.localService) ?? sameLanguage[0];
}

/** Strips markdown decoration so it is not read out loud. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/[#*`_~>]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits text at sentence boundaries into chunks of at most `max` characters. */
export function splitIntoChunks(text: string, max = 180): string[] {
  const sentences: string[] = [];
  let current = "";
  for (const ch of text) {
    current += ch;
    if (ch === "।" || ch === "." || ch === "!" || ch === "?" || ch === "\n") {
      sentences.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) sentences.push(current.trim());

  const chunks: string[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer.trim()) chunks.push(buffer.trim());
    buffer = "";
  };

  for (const sentence of sentences.filter(Boolean)) {
    if (sentence.length > max) {
      flush();
      let rest = sentence;
      while (rest.length > max) {
        let cut = rest.lastIndexOf(" ", max);
        if (cut < max / 2) cut = max;
        chunks.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      buffer = rest;
      continue;
    }
    if ((buffer + " " + sentence).trim().length > max) {
      flush();
      buffer = sentence;
    } else {
      buffer = buffer ? `${buffer} ${sentence}` : sentence;
    }
  }
  flush();
  return chunks;
}

/**
 * Speaks `text`, resolving once playback has been queued.
 * The returned handle stops playback and reports whether a matching voice exists.
 */
export async function speakText(text: string, options: SpeakOptions = {}): Promise<SpeakHandle> {
  const synth = window.speechSynthesis;
  const lang = options.lang ?? detectSpeechLang(text);
  const rate = options.rate ?? 0.95;

  synth.cancel();
  const voices = await loadVoices();
  const voice = pickVoice(voices, lang);

  // Chromium drops an utterance queued in the same tick as cancel().
  await new Promise((resolve) => setTimeout(resolve, 80));

  const chunks = splitIntoChunks(cleanForSpeech(text));
  let stopped = false;
  let finished = 0;

  // Kept on the handle so Chromium cannot garbage-collect them mid-playback.
  const utterances: SpeechSynthesisUtterance[] = chunks.map((chunk) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = lang;
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onend = () => {
      finished += 1;
      if (!stopped && finished >= chunks.length) {
        clearInterval(keepAlive);
        options.onEnd?.();
      }
    };
    u.onerror = (event) => {
      if (event.error === "interrupted" || event.error === "canceled") return;
      stopped = true;
      clearInterval(keepAlive);
      options.onEnd?.();
    };
    return u;
  });

  // Chromium pauses long sessions; nudging resume() keeps multi-chunk playback going.
  const keepAlive = setInterval(() => {
    if (stopped) return;
    if (synth.paused) synth.resume();
    if (!synth.speaking && !synth.pending) {
      clearInterval(keepAlive);
    }
  }, 4000);

  utterances.forEach((u) => synth.speak(u));

  return {
    stop: () => {
      stopped = true;
      clearInterval(keepAlive);
      synth.cancel();
    },
    voiceFound: voice !== null,
    voiceName: voice?.name ?? null,
    // Keep the references alive for the lifetime of the handle.
    ...({ _utterances: utterances } as object),
  } as SpeakHandle;
}
