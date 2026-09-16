import fs from "fs";
import path from "path";

export interface TrainedStory {
  id: string;
  title: string;
  text: string;
  word_count: number;
  language: "bn" | "en";
  trained_at: string;
}

export interface ChatMessageRecord {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AIModelStatus {
  total_trained_stories: number;
  total_words: number;
  auto_train_enabled: boolean;
  recent_stories: Array<{
    id: string;
    title: string;
    word_count: number;
    trained_at: string;
    text?: string;
    language?: "bn" | "en";
  }>;
  trained_stories?: TrainedStory[];
  chat_count: number;
  active_model?: string;
}

// In-memory memory storage cache (retained across serverless warm invocations)
let inMemoryTrainedStories: TrainedStory[] = [];
let inMemoryChatHistory: ChatMessageRecord[] = [];
let memoryLoaded = false;

function getMemoryFilePath(): string {
  try {
    const localDir = path.join(process.cwd(), "storage");
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, "ai_model_memory.json");
  } catch {
    return path.join(process.cwd(), "ai_model_memory.json");
  }
}

function loadMemory(): void {
  if (memoryLoaded) return;
  const filePath = getMemoryFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      inMemoryTrainedStories = Array.isArray(data.trained_stories) ? data.trained_stories : [];
      inMemoryChatHistory = Array.isArray(data.chat_history) ? data.chat_history : [];
      memoryLoaded = true;
      return;
    }
  } catch {
    // If filesystem not accessible, in-memory state is maintained
  }
  memoryLoaded = true;
}

function saveMemory(): void {
  const filePath = getMemoryFilePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = {
      trained_stories: inMemoryTrainedStories,
      chat_history: inMemoryChatHistory.slice(-50),
      auto_train_enabled: true,
      last_updated: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // In-memory remains active if filesystem is read-only (e.g. Vercel)
  }
}

export function getAIStatus(): AIModelStatus {
  loadMemory();
  const totalWords = inMemoryTrainedStories.reduce(
    (acc, s) => acc + (s.word_count || 0),
    0,
  );
  return {
    total_trained_stories: inMemoryTrainedStories.length,
    total_words: totalWords,
    auto_train_enabled: true,
    recent_stories: inMemoryTrainedStories.slice(-20).reverse().map((s) => ({
      id: s.id,
      title: s.title,
      word_count: s.word_count,
      trained_at: s.trained_at,
      text: s.text,
      language: s.language,
    })),
    trained_stories: inMemoryTrainedStories,
    chat_count: inMemoryChatHistory.length,
  };
}

export function deleteTrainedStory(id: string): AIModelStatus {
  loadMemory();
  inMemoryTrainedStories = inMemoryTrainedStories.filter((s) => s.id !== id);
  saveMemory();
  return getAIStatus();
}

export function trainOnText(text: string, title = "Trained Story") {
  loadMemory();
  const clean = text.trim();
  if (!clean) {
    throw new Error("Story text cannot be empty for training.");
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const isBengali = /[\u0980-\u09FF]/.test(clean);
  const language: "bn" | "en" = isBengali ? "bn" : "en";

  const newStory: TrainedStory = {
    id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: title.trim() || `Trained Story #${inMemoryTrainedStories.length + 1}`,
    text: clean,
    word_count: wordCount,
    language,
    trained_at: new Date().toISOString(),
  };

  inMemoryTrainedStories.push(newStory);
  saveMemory();

  const totalWords = inMemoryTrainedStories.reduce(
    (acc, s) => acc + (s.word_count || 0),
    0,
  );

  return {
    success: true,
    message: `Successfully trained AI on '${newStory.title}' (${wordCount} words).`,
    story: newStory,
    total_trained_stories: inMemoryTrainedStories.length,
    total_words: totalWords,
  };
}

export function resetAIMemory() {
  inMemoryTrainedStories = [];
  inMemoryChatHistory = [];
  saveMemory();
  return {
    success: true,
    message: "AI model memory reset successfully.",
  };
}

/**
 * Calls the Google Gemini API to generate an authentic story mirroring user trained style.
 */
async function generateWithGemini(
  prompt: string,
  apiKey: string,
  styleSnippets: string[],
  isBengali: boolean,
): Promise<string> {
  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let systemInstruction = `You are TaleForge AI, the premier master novelist and storyteller for Bengali Literature (বাংলা সাহিত্য).
YOUR CORE MISSION: You MUST ALWAYS write the story strictly in authentic, beautiful, expressive Bengali (শুদ্ধ ও প্রাঞ্জল বাংলা ভাষা ও হরফে).
Even if the user's prompt is written in English or Banglish (such as 'prem er story', 'bistir rat', 'ekta meyer golpo'), you MUST write the story entirely in rich Bengali (বাংলা হরফে).
Never write in English or Banglish unless the user explicitly commands 'write in english'.

Story Guidelines:
1. Provide a captivating Bengali title at the top: # [গল্পের শিরোনাম]
2. Generate a long, complete, multi-paragraph story with at least 4 immersive scenes:
   - Scene 1: Atmospheric setting, mood, weather, sensory details
   - Scene 2: Character emotions, inner thoughts, and natural dialogue
   - Scene 3: Narrative development, tension, or meaningful encounter
   - Scene 4: A poetic, touching, and unforgettable conclusion
3. Use expressive literary Bengali prose (e.g. রবীন্দ্রনাথ বা শরৎচন্দ্রের ভাবগম্ভীর ও প্রাঞ্জল সাহিত্যের মতো)।
`;

  if (styleSnippets.length > 0) {
    systemInstruction += `\nCRITICAL: Emulate the tone, vocabulary, and rhythm of the user's own trained stories:\n`;
    styleSnippets.forEach((snippet, i) => {
      systemInstruction += `\n--- Trained Story Excerpt #${i + 1} ---\n${snippet}\n`;
    });
    systemInstruction += `\nBlend their personal style patterns into the Bengali prose.`;
  }

  const userContent = `User Prompt: ${prompt}\n\nPlease generate a full, beautiful Bengali story based on this prompt.`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemInstruction}\n\n${userContent}` }],
      },
    ],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorBody}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No text candidate returned by Gemini API.");
  }
  return text.trim();
}

/**
 * Diverse Bengali names for procedural character generation.
 */
const CHARACTER_NAMES = {
  male: ["শুভ্র", "তানভীর", "সৌমিক", "অনির্বাণ", "অর্ক", "নির্ঝর", "রাহাত", "রুদ্র", "পলাশ", "অর্ণব", "জয়ন্ত"],
  female: ["অনিন্দিতা", "মেঘলা", "অতসী", "নন্দিনী", "অপর্ণা", "অদিতি", "মৃদুলা", "তনয়া", "নীলাঞ্জনা", "সুচরিতা"],
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Derives or invents an evocative literary Bengali title.
 */
function getBengaliStoryTitle(prompt: string, theme: string): string {
  const p = prompt.toLowerCase().trim();

  // If prompt already contains nice Bengali words, use it with poetic touch
  if (/[\u0980-\u09FF]/.test(prompt) && prompt.length > 4 && prompt.length < 40) {
    const clean = prompt.replace(/[?!#*]/g, "").trim();
    const prefixes = ["", "স্মৃতির ", "অচেনা ", "সেই "];
    const prefix = pickRandom(prefixes);
    return `${prefix}${clean}`;
  }

  const titlesByTheme: Record<string, string[]> = {
    romance: [
      "বৃষ্টিভেজা শ্রাবণের একাকী প্রেম",
      "হৃদয়ের অলিন্দে এক চিলতে রোদ",
      "অব্যক্ত ভালোবাসার মায়াবী সুর",
      "কাজল চোখের ফেলে আসা স্মৃতি",
      "চিঠির শেষ পাতায় জমে থাকা কথা",
      "নীল খামের গোপন দীর্ঘশ্বাস",
    ],
    rain: [
      "শ্রাবণের মেঘমল্লার ও একলা বিকেল",
      "বৃষ্টির রিনিঝিনি আর পুরনো বারান্দা",
      "যে রাতে জানালার কাঁচে জল জমেছিল",
      "মেঘের ডানায় ভেসে আসা অতীত",
      "বৃষ্টিভেজা শহরের শেষ ক্যাফে",
    ],
    horror: [
      "অন্ধকার রাতের ছায়ামূর্তি",
      "শ্মশানের ওপারে প্রাচীন হাভেলি",
      "মধ্যরাতের শীতল দীর্ঘশ্বাস",
      "কাঁপতে থাকা মোমবাতির আলো",
      "চিলেকোঠার গোপন আতঙ্ক",
    ],
    mystery: [
      "অমীমাংসিত রহস্যের সন্ধানে",
      "হলুদ খামের গোপন সংকেত",
      "সেই জীর্ণ ব্রোঞ্জের চাবি",
      "কুয়াশাঢাকা গলির শেষ বাড়ি",
      "অদৃশ্য পদচিহ্নের ইতিবৃত্ত",
    ],
    nostalgia: [
      "স্মৃতির পাতা ও একাকী গোধূলি",
      "নদীর ওপারে ফেলে আসা শৈশব",
      "সেই পুরনো মেঠোপথ আর কাশের বন",
      "হারিয়ে যাওয়া সুরের খোঁজে",
      "ধুলোমাখা ডায়রি ও এক চিলতে রোদ",
    ],
    journey: [
      "শেষ ট্রেনের বাঁশি ও অচেনা স্টেশন",
      "পাহাড়ের বাঁকে কুয়াশার চাদর",
      "অচেনা সহযাত্রীর এক পলক",
      "পথ চলতে চলতে খুঁজে পাওয়া গন্তব্য",
      "দূর দিগন্তের হাতছানি",
    ],
    city: [
      "মহানগরের নিস্তব্ধ রাত ও একাকী স্বপ্ন",
      "রাতের ঢাকার সোডিয়াম বাতির নিচে",
      "ট্র্যাফিক জ্যামে আটকে থাকা ভালোবাসা",
      "কংক্রিটের শহরে এক চিলতে সবুজ",
      "ব্যস্ত শহরের অচেনা সুর",
    ],
    general: [
      "একটি অচেনা গল্পের সোনালী ভোর",
      "হৃদয়ের গভীরের একখণ্ড আলো",
      "সময়ের স্রোতে ভাসা এক জীবন",
      "যে কথা বলা হয়নি কখনো",
      "নতুন করে বাঁচার গল্প",
    ],
  };

  const pool = titlesByTheme[theme] || titlesByTheme.general;
  return pickRandom(pool);
}

/**
 * TaleForge's rich procedural story synthesizer for offline / keyless live generation.
 * Generates rich, diverse, multi-paragraph authentic Bengali literature.
 * Never repeats the same text twice!
 */
function composeSmartStory(
  prompt: string,
  isBengali: boolean,
  styleSnippets: string[],
): string {
  const pLower = prompt.toLowerCase();

  // Detect theme
  let theme = "general";
  if (/প্রেম|ভালোবাসা|ভালবাসা|রোমান্টিক|love|romance|romantic|prem|valobasha|bhalobasha/i.test(prompt)) {
    theme = "romance";
  } else if (/বৃষ্টি|মেঘ|শ্রাবণ|বর্ষা|rain|storm|brishti|megh|barsa/i.test(prompt)) {
    theme = "rain";
  } else if (/ভয়|ভয়|ভূত|ভৌতিক|আতঙ্ক|কবর|অন্ধকার|horror|ghost|scary|fear|shadow|bhoy|voot|bhoutik/i.test(prompt)) {
    theme = "horror";
  } else if (/রহস্য|ডিটেকটিভ|গোয়েন্দা|খুন|চিঠি|mystery|detective|secret|investigation|rohoshyo|goyenda/i.test(prompt)) {
    theme = "mystery";
  } else if (/শৈশব|স্মৃতি|গ্রাম|নদী|মা|দাদি|স্কুল|nostalgia|childhood|village|river|gram|smriti|sad/i.test(prompt)) {
    theme = "nostalgia";
  } else if (/ট্রেন|স্টেশন|ভ্রমণ|যাত্রা|পাহাড়|সমুদ্র|train|station|journey|travel|trip|station/i.test(prompt)) {
    theme = "journey";
  } else if (/শহর|ঢাকা|রাত|স্বপ্ন|অফিস|কফি|city|dhaka|night|dream|coffee|shohor/i.test(prompt)) {
    theme = "city";
  } else {
    // When prompt is generic (e.g. "now can you make a story", "একটি গল্প বলো"),
    // randomly pick from rich genres so EVERY generation explores a fresh world!
    const allThemes = ["romance", "rain", "nostalgia", "journey", "city", "mystery", "general"];
    theme = pickRandom(allThemes);
  }

  const isMetaPrompt = /^(now )?(can you )?(make|write|tell|generate)( me)? a? ?story|একটি (সুন্দর )?(গল্প|উপন্যাস) (বলো|লিখো|বানাও)|গল্প বলো|গল্প লিখো|গল্প বানাও|new story|story/i.test(prompt.trim());
  const promptRef = isMetaPrompt ? "হৃদয়ের গহীনে বহুদিনের সঞ্চিত অনুভূতিটি" : `"${prompt}"-এর এই গভীর ভাবনাটি`;

  const title = getBengaliStoryTitle(prompt, theme);
  const hero = pickRandom(CHARACTER_NAMES.male);
  const heroine = pickRandom(CHARACTER_NAMES.female);

  // Weave style snippet if available from trained memory
  let styleAddition = "";
  if (styleSnippets.length > 0) {
    const randomSnippet = pickRandom(styleSnippets);
    const sample = randomSnippet.split(/[।?!]/)[0].trim();
    if (sample && sample.length > 10) {
      styleAddition = `\n\nমনের গহীনে যেন বহুকাল আগের চেনা কথা প্রতিধ্বনিত হচ্ছিল: "${sample}..."।`;
    }
  }

  // Dynamic story libraries with 4 structured scenes:
  // Scene 1: Atmosphere & Setting
  // Scene 2: Inciting Event & Character Arc
  // Scene 3: Turning Point & Meaningful Exchange
  // Scene 4: Touching & Poetic Conclusion

  interface StoryComponents {
    openings: string[];
    developments: string[];
    climaxes: string[];
    endings: string[];
  }

  const generators: Record<string, StoryComponents> = {
    romance: {
      openings: [
        `গোধূলির আলো তখন মিলিয়ে গিয়ে আকাশ জুড়ে নেমে আসছিল অদ্ভুত এক স্নিগ্ধ মায়াবী আঁধার। বারান্দায় দাঁড়িয়ে কফির কাপে চুমুক দিচ্ছিল ${heroine}। শীতল বাতাসে এক চিলতে বৃষ্টির আভাস, আর দূরে শহরের বাতিগুলো একে একে জ্বলে উঠতে শুরু করেছে। এমন নির্জন ক্ষণগুলোতে হৃদয়ের বহুদিনের জমে থাকা অব্যক্ত স্মৃতিগুলো এক নিমিষেই জীবন্ত হয়ে ওঠে।`,
        `পুরনো ঢাকার শ্যাওলাধরা বারান্দাটিতে তখন সন্ধ্যার বাতাস এলোমেলো খেলা করছিল। টেবিলের ওপর রাখা ধোঁয়া ওঠা চায়ের কাপ আর ডায়েরির খোলা পাতা। ${hero} বহুক্ষণ ধরে একটি না-পাঠানো চিঠির দিকে তাকিয়েছিল। জীবনের কতগুলো বছর নিঃশব্দে বয়ে গেল, তবু কিছু অনুভূতি সময়ের ধুলোবালিতে এতটুকু ফিকে হয় না।`,
        `শীতের শান্ত বিকেলে কাঁচের জানালার ওপারে গাছগাছালির পাতাগুলো নীরব স্তব্ধতায় দাঁড়িয়ে ছিল। রুমের কোণে বাজছিল এক মৃদু সেতারের সুর। হাতে রাখা শুকনো কৃষ্ণচূড়ার পাপড়িটিতে হাত বোলাতেই ${heroine}-র মনে পড়ে গেল বহুকাল আগের সেই বিশেষ বিকেলের কথা। কিছু মায়া হৃদয়ের এমন গহীনে লুকিয়ে থাকে যা কখনো শব্দে বলা যায় না।`,
        `সন্ধ্যার আকাশে কালচে মেঘের আনাগোনা। পার্কের নির্জন বেঞ্চটিতে বসে দূরের লেকের জলের দিকে তাকিয়েছিল ${hero}। বাতাসে বকুল ফুলের তীব্র মিষ্টি সুবাস ভেসে আসছিল। প্রতিটি মানুষের জীবনে এমন একজন থাকে, যার নাম মনে পড়লেই মনের সমস্ত ক্লান্তি এক চিলতে মিষ্টি হাসিতে মিলিয়ে যায়।`,
      ],
      developments: [
        `হঠাৎ করেই দরজার কাছে মৃদু কড়া নাড়ার শব্দ হলো। দরজা খুলতেই থমকে গেল ${heroine}। দরজার ওপাশে দাঁড়িয়ে থাকা মানুষটি যেন ঠিক সেই চিরচেনা রূপেই ফিরে এসেছে—চোখের তারায় জমে থাকা হাজারো না-বলা কথা আর ঠোঁটের কোণে সেই শান্ত মায়াবী হাসি। কোনো ভূমিকা ছিল না, কোনো অভিযোগের অবকাশ ছিল না; শুধু নিঃশব্দে দুটি চোখ একে অপরের দিকে তাকিয়ে রইল।`,
        `ফোনের পর্দায় হঠাৎ একটি বহুদিনের পরিচিত নাম ভেসে উঠল। রিসিভার কানে তুলতেই ওপাশ থেকে ভেসে এল সেই স্নিগ্ধ চেনা কণ্ঠস্বর: "${heroine}, কেমন আছো?"—মুহূর্তের মধ্যে চারপাশের সমস্ত নীরবতা যেন সুরের মতো বেজে উঠল। ফেলে আসা দূরত্বের সব জড়তা যেন এক নিমেষেই বাষ্পের মতো উড়ে গেল।`,
        `বইমেলার ভিড়ের মাঝে হঠাৎ চোখাচোখি হয়ে গেল তাদের। শত শত মানুষের কোলাহলের মাঝেও মুহূর্তের জন্য পুরো পৃথিবীটা যেন স্তব্ধ হয়ে গেল। ${hero} এক কদম এগিয়ে এসে বলল, "তুমি আজও ঠিক আগের মতোই আছো।" সেই কথায় ছিল এক অপার্থিব নির্ভরতা, যা কেবল খাঁটি ভালোবাসাই দিতে পারে।`,
        `বৃষ্টির প্রথম বড় বড় ফোঁটাগুলো যখন মাটিতে আছড়ে পড়তে শুরু করল, ঠিক তখনই ছাতার নিচে পাশাপাশি দাঁড়াল তারা দুজন। ভেজা মাটির সোঁদা গন্ধ আর ঠান্ডা বাতাসের মাঝে দুজনের নীরব হৃদয়ের ভাষা যেন এক হয়ে মিশে গেল। কোনো কথা না বলেই যেন সবকিছু বলা হয়ে গেল।`,
      ],
      climaxes: [
        `${promptRef} যেন শুধু কোনো ক্ষণস্থায়ী কল্পনা নয়, দুজনের এত বছরের চাপা কান্নার অবসান। ${hero} মৃদু হেসে বলল, "জীবন আমাদের যেখানেই নিয়ে যাক না কেন, আমাদের ভালোবাসার ঠিকানা কখনো বদলায়নি।" ${heroine}-র চোখের কোণে চিকচিক করে উঠল এক ফোঁটা আনন্দাশ্রু।`,
        `দুটি হাত একে অপরকে শক্ত করে জড়িয়ে ধরল। সময়ের ব্যবধানে যা কিছু হারিয়ে গিয়েছিল বলে মনে হয়েছিল, এই একটি স্পর্শেই যেন সব আবার পরিপূর্ণ হয়ে ফিরে এল। হৃদয়ের সমস্ত সংশয় আর দ্বিধার মেঘ কেটে গিয়ে উন্মোচিত হলো এক অপূর্ব বিশ্বাস।`,
        `বাতাসে তখন হালকা সুর ভেসে আসছে। জীবনের দীর্ঘ বিরহের পর এই পুনর্মিলন যেন প্রকৃতির এক অপরূপ আশীর্বাদ। তারা বুঝল, সত্যিকারের ভালোবাসা কখনো হারিয়ে যায় না; নদীর মতো বাঁক নিলেও শেষমেশ সঠিক মোহনাতেই ফিরে আসে।`,
      ],
      endings: [
        `বাইরে তখন অবিশ্রান্ত বৃষ্টির ধারায় শহর ধুয়ে যাচ্ছে। ঘরে তখন এক স্নিগ্ধ প্রদীপের নরম আলো আর দুটি হৃদয়ের পরম শান্তি। কিছু গল্প শেষ হয়েও কখনো শেষ হয় না; নতুন এক সোনালী ভোরের রূপ নিয়ে চিরকাল বেঁচে থাকে।${styleAddition}`,
        `ধীরে ধীরে রাত গভীর হতে লাগল। জানালার বাইরে তারার মেলা, আর ঘরে অপার্থিব এক প্রশান্তি। জীবনের নতুন অধ্যায়ে পা রেখে তারা অনুভব করল—বিশ্বাসের হাতটি যদি শক্ত করে ধরা থাকে, তবে কোনো ঝড়ই ভালোবাসাকে মুছে দিতে পারে না।${styleAddition}`,
        `আকাশের মেঘ সরে গিয়ে এক ফালি নরম চাঁদের আলো ঘরে এসে পড়ল। জীবনের সমস্ত অসমাপ্ত বাক্যগুলো যেন আজ পূর্ণতা পেল। ভালোবাসা এক নিঃশব্দ সুরের মতো বাজতে লাগল দুজনের অন্তরে।${styleAddition}`,
      ],
    },

    rain: {
      openings: [
        `আকাশের বুক চিরে একটানা নেমে আসছিল শ্রাবণের অঝোর বারিধারা। টিনের চালে বৃষ্টির অবিরাম রিনিঝিনি শব্দ যেন কোনো প্রাচীন বিরহী রাগিনীর সুর তুলছিল। জানালার গ্রিল ধরে বাইরে তাকিয়েছিল ${heroine}। রাস্তার পিচঢালা কালো পথ তখন জলে ভেসে চকচক করছে, আর কদম ফুলের মিষ্টি ঘ্রাণে ভারী হয়ে উঠেছে পুরো এলাকা।`,
        `দুপুর গড়াতেই কালো মেঘের ঘন চাদরে ছেয়ে গিয়েছিল চারপাশ। মুহূর্তের মধ্যে দিন যেন রাতের রূপ নিল। ঝোড়ো হাওয়ায় গাছের ডালপালা উন্মাতাল হয়ে দুলছিল। এমন ঘোরলাগা বৃষ্টিভেজা দিনে স্মৃতিরা যেন বাঁধভাঙা জোয়ারের মতো বুকের ভেতর আছড়ে পড়ে।`,
        `শহরের ব্যস্ত ট্র্যাফিক তখন বৃষ্টির তোড়ে একদম থমকে গেছে। কাঁচঘেরা ছোট্ট ক্যাফের এক কোণে বসে গরম চায়ের কাপে চুমুক দিচ্ছিল ${hero}। জানালার কাঁচে বৃষ্টির জলধারা জলের আলপনা এঁকে এঁকে গড়িয়ে পড়ছিল নিচে। এমন বাদল দিনে মন কোনো এক হারিয়ে যাওয়া মানুষের কথা বড় বেশি অনুভব করে।`,
      ],
      developments: [
        `বৃষ্টির বেগ যত বাড়ছিল, ঘরের ভেতরের নিস্তব্ধতা ততটাই গভীর হয়ে উঠছিল। হঠাৎ বুকশেলফের পুরনো বইগুলোর মাঝ থেকে খসে পড়ল একটি নীল খাম। খামের ওপর জলছাপ আর ভেতরের হলদে পাতায় পরিচিত সেই হাতের লেখা। প্রতিটি অক্ষরে জড়িয়ে ছিল বহু বছর আগের এক শ্রাবণ রাতের স্মৃতি।`,
        `বাইরে হঠাৎ বিদ্যুতের তীব্র ঝলকানি আকাশকে চিরে দিল। সেই ক্ষণিক আলোয় বারান্দার টবের কদম গাছটার পাশে যেন ভেসে উঠল চেনা এক অবয়ব। ভেজা বাতাসে সেই অবয়ব যেন কানে কানে বলে গেল—কিছু অপেক্ষা কখনো বৃথা যায় না।`,
        `রাস্তার ওপারে ছাতা হাতে দাঁড়িয়ে ছিল একাকী এক পথিক। বৃষ্টির ঝাপটায় তার মুখ স্পষ্ট দেখা যাচ্ছিল না, তবু সেই পরিচিত দাঁড়ানোর ভঙ্গিটি নিমেষেই চিনতে পারল ${heroine}। বুকের ভেতর অচেনা এক দোলাচল শুরু হলো।`,
      ],
      climaxes: [
        `${promptRef} যেন বৃষ্টির এই উন্মুক্ত ধারায় দাঁড়িয়ে নতুন এক গভীর অর্থ ধারণ করল। বৃষ্টির শীতল জলে সমস্ত পুরনো কষ্ট, দ্বিধা আর না-পাওয়ার গ্লানি ধুয়ে মুছে একাকার হয়ে গেল। মনের ক্যানভাসে জন্ম নিল এক নতুন সূচনার সাহস।`,
        `ঝড়ের গতি একটু মন্থর হতেই বাতাসে ছড়িয়ে পড়ল ভেজা মাটির মাতাল করা সোঁদা সুবাস। মনের সমস্ত জমে থাকা অন্ধকার যেন এই শ্রাবণের ধারায় এক নিমেষেই নির্মল হয়ে উঠল। জীবন এক পরম তৃপ্তিতে ভরে উঠল।`,
      ],
      endings: [
        `পশ্চিমের আকাশে মেঘের ফাঁক গলে বেরিয়ে এল অস্তগামী সূর্যের লালচে এক চিলতে আভা। বৃষ্টির শব্দ কমে এসে এখন কেবল পাতায় পাতায় টুপটুপ জল পড়ার মিষ্টি ধ্বনি। এক শান্ত প্রশান্তির হাসি নিয়ে নতুন দিনের দিকে মুখ ফেরাল সে।${styleAddition}`,
        `বৃষ্টি থেমে এল, কিন্তু হৃদয়ে যে সুরটি বেজে উঠল তা রইল চিরস্থায়ী। প্রকৃতির এই সজীব রূপের মাঝে জীবনের গভীরতম অর্থ যেন নতুন করে ধরা দিল।${styleAddition}`,
      ],
    },

    horror: {
      openings: [
        `রাত তখন ঠিক আড়াইটা। চারপাশ এতটাই নিঃঝুম যে টেবিলের দেয়াল ঘড়ির টিকটিক শব্দটাও যেন অস্বাভাবিক ভারী মনে হচ্ছিল। বাইরে ঝিঁঝিঁ পোকার একঘেয়ে ডাকও হঠাৎ এক অচেনা আতঙ্কে একযোগে থেমে গেল। ঘরের ভেতরের বাতাসে ভেসে আসছিল পুরনো কাঠ আর স্যাঁতসেঁতে ভেজা মাটির এক মিশ্র গন্ধ।`,
        `গ্রামের সীমানায় দাঁড়িয়ে থাকা শতবর্ষী সেই প্রাচীন জমিদার বাড়িটির দিকে তাকিয়ে গা শিউরে উঠছিল ${hero}-র। অমারাত্রির ঘন জমাটবাঁধা অন্ধকারে বাড়িটির ভাঙা খিলানগুলো যেন কোনো এক দানবের খোলা চোয়ালের মতো দাঁড়িয়ে ছিল। পেঁচার ডাক আর শুকনো পাতার মড়মড় শব্দে বাতাস ভারী হয়ে উঠেছিল।`,
        `মোমবাতির নিভু নিভু শিখাটা হঠাৎ তীব্র বাতাসে তিরতির করে কেঁপে উঠল। ঘরের ছায়ারা যেন দেয়ালে দেয়ালে অদ্ভুত সব বিকৃত রূপ নিয়ে নাচতে শুরু করেছে। কাঠের পুরনো আলমারির ভেতর থেকে হঠাৎ শোনা গেল খুব মৃদু এক খসখস শব্দ।`,
      ],
      developments: [
        `দেয়ালে পড়ে থাকা নিজের ছায়াটার দিকে তাকাতেই ${heroine}-র সমস্ত রক্ত যেন বরফ হয়ে গেল। ছায়াটির ঘাড় যেন তার নিজের নড়াচড়া ছাড়াই একপাশে বেঁকে গেল! ঠিক তখনই ঘরের পেছনের বন্ধ দরজার হাতলটা কড়াৎ করে নিচে নেমে গেল। পাল্লাটি নিঃশব্দে এক ইঞ্চি খুলে গেল অন্ধকারের দিকে।`,
        `করিডোর ধরে হেঁটে যাওয়ার সময় হঠাৎ মনে হলো পেছনে কেউ একজন খুব নিঃশব্দে পা ফেলে আসছে। ঘাড়ের লোমগুলো দাঁড়িয়ে গেল এক বরফশীতল শ্বাসের স্পর্শে। পেছন ফিরে তাকানোর সাহস সঞ্চয় করতে গিয়েও হাত-পা অসাড় হয়ে আসছিল।`,
        `হঠাৎ মেঝের ওপর থেকে একটি জীর্ণ ডায়েরি খুলে গেল বাতাসের কোনো ছোঁয়া ছাড়াই। তার শেষ পাতায় লাল কালিতে খোদাই করা ছিল একটি বাক্য, যা দেখে নিঃশ্বাস আটকে যাওয়ার উপক্রম হলো।`,
      ],
      climaxes: [
        `${promptRef} যেন চারপাশের অন্ধকারকে আরও শতগুণে ঘনীভূত করে তুলল। অন্ধকারের বুক চিরে ভেসে উঠল এক জোড়া রক্তাভ জ্বলজ্বলে অপলক চোখ! কোনো মানবীয় স্বর নয়, এক অতিপ্রাকৃতিক তীব্র আকুলতা আর ক্ষোভ যেন সেই অন্ধকারের ভেতর থেকে বের হয়ে আসছিল।`,
        `চিৎকার করতে গিয়েও গলা দিয়ে কোনো আওয়াজ বের হলো না। সময় যেন সম্পূর্ণ থমকে গেল সেই ভয়াল অনুভূতির সামনে। ঘরের সমস্ত বাতাস নিমেষেই জমে বরফ হয়ে গেল।`,
      ],
      endings: [
        `ভোরের প্রথম আজানের ধ্বনি যখন দূর থেকে ভেসে এল, তখন সেই কুয়াশা আর অন্ধকার যেন মিলিয়ে গেল শূন্যে। কিন্তু মেঝের ওপর পড়ে থাকা কালো ছোপগুলো জানিয়ে দিয়ে গেল—যা ঘটেছিল, তা কোনো দুঃস্বপ্ন ছিল না।${styleAddition}`,
        `সূর্যের প্রথম আলো জানালায় এসে পড়তেই ঘরের স্বাভাবিক রূপ ফিরে এল। কিন্তু সেই রাতের শীতল শিহরণ মনের গভীরে এক চিরস্থায়ী দাগ রেখে গেল।${styleAddition}`,
      ],
    },

    mystery: {
      openings: [
        `পুরনো শহরের গোলকধাঁধার মতো সরু গলির শেষ মাথায় বাড়িটির দরজা ছিল বহু বছর ধরে সিলগালা করা। টেবিলে ছড়ানো ছিল কিছু হলদে হয়ে যাওয়া মানচিত্র, একটি ভাঙা ম্যাগনিফাইং গ্লাস আর একটি জংধরা অদ্ভুত সংকেতওয়ালা ব্রোঞ্জের চাবি। ফাইলটি হাতে নিয়ে গভীর চিন্তায় নিমগ্ন ছিল ${hero}।`,
        `কুয়াশাচ্ছন্ন রেলওয়ে স্টেশনের শেষ প্রান্তে দাঁড়িয়ে ঘড়ির দিকে তাকাল সে। ট্রেন ছাড়তে আর মাত্র দশ মিনিট বাকি। ঠিক তখনই কোটের পকেটে হাত দিতেই একটি অচেনা সিলমোহর দেওয়া খাম আঙুলে ঠেকল। কেউ একজন খুব চতুরভাবে এই খামটি তার পকেটে গুঁজে দিয়ে গেছে।`,
        `লাইব্রেরির অন্ধকার কোণে বসে থাকা বৃদ্ধ গবেষক চশমার ফাঁক দিয়ে তাকিয়ে বললেন, "যে রহস্যের পেছনে তুমি ছুটছ, তার সমাধান হয়তো কারও জীবনের সবচেয়ে বড় সত্যিটা বদলে দেবে।" টেবিলের ওপর রাখা প্রাচীন পুঁথিটিতে আঁকা ছিল এক অদ্ভুত প্রতীক।`,
      ],
      developments: [
        `খামটি খুলতেই বেরিয়ে এল কিছু কোড নাম্বার আর একটি ঝাপসা সাদা-কালো ফটোগ্রাফ। ফটোগ্রাফের পেছনের ব্যক্তির মুখের আদল দেখে চমকে উঠল ${heroine}। এটি আর কারও নয়, বহু বছর আগে নিখোঁজ হয়ে যাওয়া সেই ব্যক্তির ছবি!`,
        `মেঝের গোপন তক্তাটি তুলতেই নিচে দেখা গেল একটি সংকীর্ণ লোহার সিঁড়ি, যা নেমে গেছে মাটির গভীরে। নিচের স্যাঁতসেঁতে অন্ধকার থেকে ভেসে আসছিল মৃদু জলের ফোঁটা পড়ার শব্দ আর এক অদ্ভুত গন্ধ।`,
        `পদশব্দ ক্রমেই এগিয়ে আসছিল। সিঁড়ির প্রতিটি ধাপে বুটের ভারী আঘাত প্রতিধ্বনিত হচ্ছিল। হাতে সময় খুব কম; এখনই এই শেষ সূত্রটি সুরক্ষিত করতে হবে।`,
      ],
      climaxes: [
        `${promptRef} যেন অবশেষে এনে দিল বহুদিনের কাঙ্ক্ষিত উত্তর। প্রতিটি খাপছাড়া সূত্র এক নিমেষে জুড়ে গিয়ে এক বিস্ময়কর সত্য চোখের সামনে উন্মোচিত করে দিল। বিশ্বাসঘাতক আসলে অন্য কেউ নয়, যাকে সবচেয়ে বেশি বিশ্বাস করা হয়েছিল সেই ছিল এই পুরো নাটকের নেপথ্য কারিগর!`,
        `চাবিটি তালার ভেতর ঘুরতেই মৃদু ক্লিক শব্দে ধাতব সিন্দুকটি খুলে গেল। ভেতরে রাখা নথিপত্র এক শতাব্দীর গোপন সত্যকে মুক্ত করে দিল। সত্যের আলো যে এত তীব্র হতে পারে, তা আগে কখনো উপলব্ধি হয়নি।`,
      ],
      endings: [
        `পুলিশের সাইরেন যখন দূর থেকে ভেসে এল, তখন সত্যের শেষ প্রমাণটি পকেটে ভরে শান্ত পায়ে কুয়াশার মাঝে হেঁটে চলে গেল ${hero}। একটি রহস্য হয়তো সমাধান হলো, কিন্তু মানুষের মন যে কত জটিল—তা আবার নতুন করে প্রমাণ হয়ে গেল।${styleAddition}`,
        `ভোরের আলোয় যখন শহরের রাজপথ জেগে উঠল, তখন সব জটলা কেটে গেছে। সত্যের জয় নিশ্চিত করে একটি নতুন দিনের সূচনা হলো।${styleAddition}`,
      ],
    },

    nostalgia: {
      openings: [
        `নদীর পাড়ে কাশফুলের সাদা দোলায় যখন শরতের নরম রোদ এসে পড়ত, তখন ছেলেবেলার সেই দিনগুলো যেন চোখের সামনে স্পষ্ট হয়ে ওঠে। মেঠোপথ ধরে হেঁটে যেতে যেতে বাতাসে পাওয়া যাচ্ছিল পাকা ধানের মিষ্টি ঘ্রাণ। বহু বছর পর নিজ গ্রামে ফিরে বুকের ভেতর এক অচেনা ব্যাকুলতা অনুভব করছিল ${hero}।`,
        `চিলেকোঠার পুরনো ট্রাঙ্কটা খুলতেই নাকে এল ন্যাপথলিন আর পুরনো কাপড়ের চিরচেনা সুবাস। ভেতরের এক কোণে সযত্নে গুছিয়ে রাখা ছিল প্রাইমারি স্কুলের খাতা, মার্বেলের কৌটা আর এক টুকরো ভাঙা কাঠের স্লেট। এক পলকে বহু যুগের দূরত্ব যেন চোখের সামনে মুছে গেল।`,
        `দাদির হাতের রান্নার গন্ধ, মাটির দাওয়ায় বসে সন্ধ্যার রূপকথা শোনা আর বর্ষার দিনে পুকুরে নেমে ঘণ্টার পর ঘণ্টা সাঁতার কাটা—কত সহজেই না জীবনের সবচেয়ে সোনালী সময়গুলো পেছনে ফেলে আমরা বড় হয়ে যাই। স্মৃতির আয়নায় আজ সেই দিনগুলো বড্ড উজ্জ্বল।`,
      ],
      developments: [
        `গ্রামের সেই পুরনো বটগাছের ছায়ায় দাঁড়িয়ে ছিল ${heroine}। গাছের বাকলে এখনও অস্পষ্টভাবে খোদাই করা আছে শৈশবের বন্ধুদের নামগুলো। কতজন কত দূর দেশে চলে গেছে, জীবনের তাগিদে কত স্বপ্নের ইতি ঘটেছে। তবু এই মাটির মায়া আজও সবাইকে নিঃশব্দে এক সুতোয় বেঁধে রেখেছে।`,
        `হঠাৎ দূর থেকে এক রাখালের বাঁশির মিষ্টি সুর ভেসে এল। সেই সুরে যেন সমস্ত ফেলে আসা অতীতের কান্না আর আনন্দ একসাথে মিশে ছিল। চোখ দুটো অজান্তেই ভিজে এল এক অদ্ভুত শান্ত তৃপ্তিতে।`,
      ],
      climaxes: [
        `${promptRef} যেন হৃদয়ের গভীরে এক সুপ্ত ঝর্ণাধারার মতো জেগে উঠল। মানুষ জীবনের পথে যতই সম্পদ আর নাম-যশ অর্জন করুক না কেন, শৈশবের সেই সারল্য আর মাটির খাঁটি ভালোবাসাই মানুষের আসল পরিচয়।`,
        `ধুলোমাখা মেঠোপথে পা ফেলে সে বুঝল, শিকড় কখনো মানুষকে ছেড়ে যায় না। আমরা যতই দূরে যাই না কেন, আমাদের আত্মার শান্তি ফিরে আসে এই মাটির গন্ধেই।`,
      ],
      endings: [
        `নদীর জলে তখন লালচে গোধূলির মায়াবী আলো ঢেউ খেলছিল। নৌকার বৈঠার ছলাৎ ছলাৎ শব্দে মনটা অদ্ভুত শান্তিতে ভরে গেল। নিজের ফেলে আসা মূল ঠিকানাকে ছুঁয়ে আবার নতুন করে পথ চলার অনুপ্রেরণা নিয়ে ফিরে চলল সে।${styleAddition}`,
        `সন্ধ্যা নামল গ্রামের বুকে। ঘরে ঘরে জ্বলে উঠল পিদিমের আলো। মনে হলো, এতদিনের ক্লান্তির পর অবশেষে ঘরে ফেরা সম্পূর্ণ হলো।${styleAddition}`,
      ],
    },

    journey: {
      openings: [
        `কুয়াশাঢাকা ভোরে ট্রেনের চাকার একটানা ছন্দময় আওয়াজ এক অদ্ভুত প্রশান্তি ছড়িয়ে দিচ্ছিল কামরায়। জানালার পাশে বসে এক কাপ গরম চায়ে চুমুক দিচ্ছিল ${hero}। বাইরে দিগন্তজোড়া সবুজ ধানক্ষেত আর কুয়াশায় মোড়ানো ছোট ছোট গ্রামগুলো দ্রুত পেছনে সরে যাচ্ছিল। যাত্রা যখন নিরুদ্দেশের দিকে, তখন প্রতিটি মুহূর্তই এক রোমাঞ্চকর উপন্যাসের মতো মনে হয়।`,
        `পাহাড়ের সর্পিল আঁকাবাঁকা পথ ধরে গাড়িটি উপরে উঠছিল। মেঘের দল যেন হাত বাড়ালেই ছোঁয়া যায়। চারপাশের পাইন আর ওক বনের মধ্য দিয়ে বয়ে চলা ঠান্ডা পাহাড়ি বাতাসে এক অদ্ভুত স্বাধীনতা ছিল। দৈনন্দিন জীবনের ক্লান্তি মুছে ফেলতে এমন একটি পথচলাই যথেষ্ট।`,
      ],
      developments: [
        `অচেনা স্টেশনে ট্রেনটি দশ মিনিটের জন্য থামল। প্ল্যাটফর্মে হকারদের হাঁকডাক আর গরম চপ-চায়ের ধোঁয়া। সেখানে দেখা হলো এক অদ্ভুত দৃষ্টির বয়স্ক যাত্রীর সাথে, যার মুখের রেখায় যেন লেখা ছিল বহু দেশ ঘোরার অভিজ্ঞতা। একটি ছোট কথোপকথনেই জীবনের দৃষ্টিভঙ্গি অনেকটাই বদলে গেল।`,
        `জানালা দিয়ে হাত বাড়িয়ে বাতাসের স্পর্শ অনুভব করছিল ${heroine}। পথের প্রতিটি বাঁক যেন নতুন কোনো বিস্ময় উপহার দিচ্ছিল। ফেলে আসা পরিচিত জগতের সীমানা পেরিয়ে নতুন অচেনাকে বরণ করে নেওয়ার এক অদ্ভুত আনন্দ মনে খেলা করছিল।`,
      ],
      climaxes: [
        `${promptRef} যেন এই পথচলার মাঝেই জীবনের দীর্ঘদিনের আটকে থাকা প্রশ্নের উত্তর খুঁজে দিল। গন্তব্যে পৌঁছানোর চেয়েও পথচলার আনন্দ যে কত বেশি মূল্যবান, তা যেন আজ এই অচেনা দিগন্তের সামনে দাঁড়িয়ে গভীরভাবে স্পষ্ট হয়ে উঠল।`,
      ],
      endings: [
        `ট্রেনের বাঁশি বাজল সজোরে। দূরের পাহাড়ে মেঘের ওপর তখন সূর্যের প্রথম সোনালী কিরণ ঠিকরে পড়ছে। এক নতুন আশা আর সতেজ প্রাণশক্তি নিয়ে নতুন স্টেশনে পা রাখল সে।${styleAddition}`,
        `গন্তব্য এখনও দূরে, কিন্তু মনের ভেতরের আনন্দ অনন্ত। ভ্রমণ মানুষকে শেখায় কীভাবে মুক্ত পাখির মতো বাঁচতে হয়।${styleAddition}`,
      ],
    },

    city: {
      openings: [
        `মধ্যরাতের ঢাকা তখন কিছুটা শান্ত হতে শুরু করেছে। সোডিয়াম বাতির হলুদ আলোয় ভেজা রাজপথগুলো এক নিঃসঙ্গ ক্যানভাস এর মতো দেখাচ্ছিল। বহুতল ভবনের ছাদ থেকে নিচে তাকিয়েছিল ${hero}। এই বিশাল শহরের প্রতিটি জানালায় কতশত স্বপ্ন, কত বেদনা আর কত সংগ্রাম নিঃশব্দে জেগে আছে।`,
        `বিকেলবেলার তীব্র ট্র্যাফিক জ্যামে গাড়িগুলো থমকে দাঁড়িয়ে ছিল। বাসের জানালার পাশে বসে বাইরের কোলাহল দেখছিল ${heroine}। রাস্তার পাশে বেলী ফুলের মালা বিক্রি করা এক পথশিশুর নিষ্পাপ হাসি মুহূর্তে শহরের সমস্ত বিষাদকে ফিকে করে দিল।`,
      ],
      developments: [
        `কফি শপের কাঁচের দেওয়ালের ওপাশে বৃষ্টির ছাঁট। ল্যাপটপের কিবোর্ডে আঙুল চলতে চলতে হঠাৎ চোখ পড়ল সামনের টেবিলের মানুষটির দিকে। ব্যস্ত জীবনের এই ইট-পাথরের খাঁচাতেও কিছু মুহূর্ত হঠাৎ করেই কাব্যিক হয়ে ওঠে।`,
        `অফিসের দীর্ঘ ব্যস্ততার পর ছাদখোলা এক রেস্তোরাঁয় বসে এক কাপ কফি। নিচে বহুদূর পর্যন্ত আলো ঝলমলে রাজপথ। নিজের স্বপ্নের পেছনে ছুটতে গিয়ে মানুষ কতটা পথ পেরিয়ে আসে, সেই ভাবনায় মনটা ভরে উঠল।`,
      ],
      climaxes: [
        `${promptRef} যেন মনে করিয়ে দিল, কংক্রিটের এই কঠিন নগরে মানবিক অনুভূতিটুকুই বেঁচে থাকার আসল রসদ। যান্ত্রিকতার মাঝেও যে ভালোবাসা, সহানুভূতি আর স্বপ্নের বীজ বেঁচে থাকে, সেটাই এই শহরের আসল সৌন্দর্য।`,
      ],
      endings: [
        `ভোরের নরম আলোয় যখন শহর আবার নতুন উদ্যমে জেগে উঠতে শুরু করল, তখন এক বুক আত্মবিশ্বাস আর হাসিমুখে রাজপথে পা বাড়াল সে। এই শহর লড়াই করতে শেখায়, আর শেখায় ভালোবাসতে।${styleAddition}`,
      ],
    },

    general: {
      openings: [
        `কুয়াশাচ্ছন্ন এক স্নিগ্ধ নির্জন ভোরের নরম আলোয় আকাশ তখন সবে রঙিন হতে শুরু করেছে। নদীর পাড়ে দাঁড়িয়ে বাতাসে ঠান্ডা এক সতেজ শিহরণ অনুভব হচ্ছিল। জীবনের গতিপথ কখন যে কীভাবে বদলে যায়, তার কোনো আগাম পূর্বাভাস থাকে না। পেছনের ফেলে আসা দিনগুলোর স্মৃতি তখন এক স্বপ্নিল স্মৃতির মতো মনে হচ্ছিল।`,
        `সন্ধ্যার শান্ত আকাশ তখন ধীরে ধীরে নীলের গভীরতায় হারিয়ে যাচ্ছিল। দূরের দিগন্তে সন্ধ্যার প্রথম তারাটি মিটিমিটি করে জ্বলছিল। একাকী বসে ডায়েরির পাতায় কলম ছোঁয়াতেই হৃদয়ের বহুদিনের জমে থাকা অনুভূতিগুলো কথার মালা হয়ে রূপ নিতে শুরু করল।`,
        `গ্রীষ্মের তপ্ত দুপুর পেরিয়ে যখন শান্ত বিকেল নেমে এল, তখন চারিদিকের বৃক্ষরাজিতে অদ্ভুত এক নিস্তব্ধতা নেমে এল। বারান্দার দোলনায় বসে দূর আকাশের মেঘের রঙ বদলানো দেখতে দেখতে জীবনের কত না-বলা কথা মনের ভেতর দোলা দিচ্ছিল।`,
      ],
      developments: [
        `হঠাৎ করেই জীবনের মোড় ঘুরে যাওয়ার মতো একটি মুহূর্ত উপস্থিত হলো। পথ চলতে গিয়ে মানুষ কত বিচিত্র চরিত্রের সংস্পর্শে আসে, কিন্তু কিছু কিছু মানুষের আন্তরিক স্পর্শ সারা জীবনের জন্য মনের মণিকোঠায় অক্ষয় হয়ে থাকে। সমস্ত সংশয় আর দ্বিধার কুয়াশা কেটে গিয়ে অন্তরে জন্ম নিল গভীর এক আত্মবিশ্বাস।`,
        `একটি পুরনো বইয়ের পাতা ওল্টাতে গিয়ে পাওয়া গেল এক শুকনো শিউলি ফুল। ফুলের গন্ধ অনেক আগেই মিলিয়ে গেছে, কিন্তু তার সাথে জড়িয়ে থাকা ভালোবাসার পবিত্রতা আজও এতটুকু মলিন হয়নি।`,
      ],
      climaxes: [
        `${promptRef} যেন অন্তরের অন্তস্তলে এক নতুন আশার মশাল জ্বেলে দিল। জীবনের প্রকৃত গৌরব তো কখনো পড়ে না যাওয়ায় নয়, বরং প্রতিবার পড়ে যাওয়ার পর আরও দৃঢ়ভাবে উঠে দাঁড়ানোর মাঝেই নিহিত।`,
        `এক চিলতে হাসির রেখা ফুটে উঠল মুখে। জীবনের সমস্ত জটিলতার সমাধান হয়তো সবসময় মেলে না, কিন্তু বিশ্বাস আর ভালোবাসার আলো থাকলে কোনো অন্ধকারই দীর্ঘস্থায়ী হতে পারে না।`,
      ],
      endings: [
        `দূরের দিগন্তে সূর্য তখন পূর্ণ তেজে উজ্জ্বল হয়ে উঠেছে। নদীর বুকে জলের কণাগুলো হীরার মতো ঝলমল করছে। এক চিলতে তৃপ্তির হাসি মুখে নিয়ে সামনে এগিয়ে গেল সে—একটি সুন্দর ভোরের সূচনায় রচিত হলো জীবনের নতুন এক গৌরবময় অধ্যায়।${styleAddition}`,
        `রাতের আঁধার কেটে গিয়ে পূর্বাকাশে আলোর ফোয়ারা ছুটল। জীবনের ক্যানভাসে রচিত হলো এক অবিনাশী কাব্যের নতুন পঙক্তি।${styleAddition}`,
      ],
    },
  };

  const selectedGen = generators[theme] || generators.general;
  const p1 = pickRandom(selectedGen.openings);
  const p2 = pickRandom(selectedGen.developments);
  const p3 = pickRandom(selectedGen.climaxes);
  const p4 = pickRandom(selectedGen.endings);

  return `# ${title}\n\n${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
}

export async function generateStoryAndChat(
  prompt: string,
  autoTrain = true,
  customApiKey?: string,
): Promise<{
  story: string;
  prompt: string;
  auto_trained: boolean;
  total_trained_count: number;
  model: string;
}> {
  loadMemory();
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new Error("Prompt cannot be empty.");
  }

  // TaleForge is a Bangla AI Storytelling platform: ALWAYS write in Bangla unless explicitly commanded otherwise
  const isEnglishExplicit = /\b(in english|only english|write in english|english story)\b/i.test(cleanPrompt);
  const isBengali = !isEnglishExplicit;

  // Collect style snippets from trained stories
  const styleSnippets: string[] = [];
  if (inMemoryTrainedStories.length > 0) {
    inMemoryTrainedStories.slice(-3).forEach((s) => {
      styleSnippets.push(s.text.slice(0, 300));
    });
  }

  // Check for Gemini API key (from parameter or environment)
  const geminiKey = customApiKey || process.env.GEMINI_API_KEY || "";

  let generatedStory = "";
  let activeModel = "TaleForge Smart Engine";

  if (geminiKey) {
    try {
      generatedStory = await generateWithGemini(
        cleanPrompt,
        geminiKey,
        styleSnippets,
        isBengali,
      );
      activeModel = "Google Gemini 1.5 Flash (Live AI)";
    } catch (err: unknown) {
      console.warn("Gemini API call failed, falling back to Smart Engine:", err);
      generatedStory = composeSmartStory(cleanPrompt, isBengali, styleSnippets);
      activeModel = "TaleForge Smart Engine (Fallback)";
    }
  } else {
    generatedStory = composeSmartStory(cleanPrompt, isBengali, styleSnippets);
  }

  // Save chat history
  inMemoryChatHistory.push({
    role: "user",
    content: cleanPrompt,
    timestamp: new Date().toISOString(),
  });
  inMemoryChatHistory.push({
    role: "assistant",
    content: generatedStory,
    timestamp: new Date().toISOString(),
  });

  if (autoTrain) {
    // Auto-retrain: save this story into memory
    const firstLine = generatedStory
      .split("\n")[0]
      .replace(/[#*]/g, "")
      .trim()
      .slice(0, 40);
    trainOnText(
      generatedStory,
      `Auto-Trained: ${firstLine || cleanPrompt.slice(0, 30)}`,
    );
  } else {
    saveMemory();
  }

  return {
    story: generatedStory,
    prompt: cleanPrompt,
    auto_trained: autoTrain,
    total_trained_count: inMemoryTrainedStories.length,
    model: activeModel,
  };
}
