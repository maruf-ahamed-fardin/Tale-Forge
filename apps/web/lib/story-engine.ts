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
  }>;
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
    recent_stories: inMemoryTrainedStories.slice(-10).reverse().map((s) => ({
      id: s.id,
      title: s.title,
      word_count: s.word_count,
      trained_at: s.trained_at,
    })),
    chat_count: inMemoryChatHistory.length,
  };
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

  let systemInstruction = `You are TaleForge AI, a master literary writer and storyteller.
Your task is to write a captivating, complete, multi-paragraph story based on the user's prompt.
Write primarily in ${isBengali ? "expressive, fluent Bengali (বাংলা)" : "vivid, literary English"}.
`;

  if (styleSnippets.length > 0) {
    systemInstruction += `\nCRITICAL: You MUST emulate the tone, imagery, and style of the user's own trained stories. Here are excerpts from their writing:\n`;
    styleSnippets.forEach((snippet, i) => {
      systemInstruction += `\n--- Trained Story Sample #${i + 1} ---\n${snippet}\n`;
    });
    systemInstruction += `\nBlend their stylistic vocabulary, emotional rhythm, and mood into the new story.`;
  }

  const userContent = `User Prompt: ${prompt}\n\nPlease generate a compelling, well-structured story with an atmospheric beginning, developing plot, character emotions, and a satisfying conclusion.`;

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
 * TaleForge's rich procedural story synthesizer for offline / keyless live generation.
 */
function composeSmartStory(
  prompt: string,
  isBengali: boolean,
  styleSnippets: string[],
): string {
  // Theme detection
  const isRomance =
    /প্রেম|ভালোবাসা|ভালবাসা|রোমান্টিক|বৃষ্টি|স্মৃতি|love|romance|rain|romantic/i.test(
      prompt,
    );
  const isHorror =
    /ভয়|ভূত|ভৌতিক|আতঙ্ক|কবর|অন্ধকার|horror|ghost|scary|fear|shadow/i.test(prompt);
  const isMystery =
    /রহস্য|ডিটেকটিভ|গোয়েন্দা|খুন|চিঠি|mystery|detective|secret|investigation/i.test(
      prompt,
    );
  const isThriller =
    /থ্রিলার|অ্যাকশন|পলায়ন|হুমকি|thriller|chase|danger|escape|gun/i.test(prompt);

  if (isBengali) {
    if (isRomance) {
      return (
        `# ${prompt}\n\n` +
        `শ্রাবণের একটানা বৃষ্টির শব্দে জানালার কাঁচ তখন ঝাপসা হয়ে এসেছে। বাতাসে ভেসে আসছিল ভেজা মাটির চিরচেনা গন্ধ। চায়ের কাপ থেকে ওঠা ধোঁয়ার দিকে তাকিয়ে মনে পড়ছিল বহু পুরনো কিছু স্মৃতি। জীবনের ব্যস্ততার মাঝে যা কিছু হারিয়ে গেছে বলে মনে হতো, আজ যেন সেই অনুভূতিগুলোই আবার নতুন করে জেগে উঠল।\n\n` +
        `হঠাৎ ফোনের স্ক্রিনে ভেসে উঠল একটি চেনা নাম। বহু বছর কোনো যোগাযোগ ছিল না, তবু সেই পরিচিত সুর যেন এক নিমিষেই সব দূরত্ব মুছে দিল। ওপাশে নীরবতা, কেবল বৃষ্টির শব্দ আর মৃদু শ্বাস। "${prompt}"—এই যেন শুধু একটি ভাবনা নয়, হৃদয়ের গভীরে সযত্নে লুকিয়ে রাখা এক মধুর আকুলতা। দুটি চোখের অব্যক্ত ভাষা যেমন কখনো শব্দে প্রকাশ করা যায় না, তেমনই এই ক্ষণটিও যেন সময়ের গণ্ডি পেরিয়ে এক চিরন্তন ভালোবাসার সাক্ষ্য হয়ে রইল।\n\n` +
        `বৃষ্টির বেগ ধীরে ধীরে কমে এল। জানালার গ্রিল ধরে বাইরে তাকাতেই দেখা গেল ভেজা পাতার ওপর চাঁদের আলো ঝিলমিল করছে। মনের সব সংশয় মুছে গিয়ে এক অনাবিল প্রশান্তি নেমে এল—ভালোবাসা হয়তো সত্যিই কখনো ফুরিয়ে যায় না, শুধু নতুন ভোরের আলোয় আবার ফিরে আসার অপেক্ষা করে।`
      );
    }

    if (isHorror) {
      return (
        `# ${prompt}\n\n` +
        `রাত তখন ঠিক আড়াইটা। চারপাশ এতটাই নিস্তব্ধ যে নিজের বুকের ধুকপুক শব্দও স্পষ্ট শোনা যাচ্ছিল। ঘরের কোণে রাখা পুরনো কাঠের আলমারিটা মৃদু শব্দে কেঁপে উঠল। বাতাসে ভেসে এল ভেজা মাটির সাথে পুরনো চন্দনের এক অদ্ভুত মিশ্র গন্ধ।\n\n` +
        `দেয়ালে পড়ে থাকা ছায়াটা যেন নিজে থেকেই এক পা নড়ে উঠল, অথচ ঘরে আলো দেওয়ার মতো কোনো বাতাস বা মোমবাতি ছিল না। "${prompt}"—এই চিন্তা মাথায় আসতেই মেরুদণ্ড বেয়ে এক বরফশীতল ভয়ের স্রোত নেমে গেল। দরজার হাতলটা খুব ধীরে ধীরে নিচে নামছে, কড়াৎ করে এক তীক্ষ্ণ শব্দে পাল্লাটি খুলে গেল। বাইরে কেউ নেই, কেবল অন্ধকার আর এক বরফশীতল শ্বাসের স্পর্শ ঘাড়ের ওপর এসে লাগল।\n\n` +
        `দম বন্ধ হয়ে এল। পেছনে ফিরতেই দেখা গেল দুটি জ্বলজ্বলে চোখের আলো অন্ধকারে ভেসে আছে। চিৎকার করার আগেই ঘরটা এক অচেনা শীতলতায় ডুবে গেল...`
      );
    }

    if (isMystery || isThriller) {
      return (
        `# ${prompt}\n\n` +
        `পুরাতন ঢাকার সরু গলির শেষ প্রান্তে সেই জীর্ণ হলুদ বাড়িটা বছরের পর বছর ধরে এক অমীমাংসিত রহস্য বুকে চেপে দাঁড়িয়ে আছে। ঘড়ির কাঁটা সেকেন্ডের হিসাব গুনছে, হাতে সময় আর মাত্র বারো মিনিট।\n\n` +
        `টেবিলের ওপর রাখা জীর্ণ বাদামী খামটির ওপর লাল গালা দিয়ে সিল করা। খামটি খুলতেই পাওয়া গেল এক টুকরো পুরনো হলদে কাগজ আর একটি পিতলের চাবি। "${prompt}"—চিঠির শেষ লাইনে লেখা কথাটি পড়েই চোখ স্থির হয়ে গেল। ঠিক সেই মুহূর্তে সিঁড়িতে ভারী বুটের স্পষ্ট পদশব্দ প্রতিধ্বনিত হলো। কেউ একজন উপরে উঠে আসছে, আর তার উদ্দেশ্য মোটেও ভালো নয়।\n\n` +
        `এক মুহূর্তও নষ্ট না করে পেছনের গোপন জানালার দিকে পা বাড়াল সে। রহস্যের জাল যতই জটিল হোক না কেন, আজ রাতের মধ্যেই এই অন্ধকার ইতিহাসের সমাপ্তি টানতে হবে।`
      );
    }

    // Default rich Bengali narrative
    return (
      `# ${prompt}\n\n` +
      `কুয়াশাচ্ছন্ন এক স্নিগ্ধ সকালের নরম আলোয় চারিদিক তখন আলোকিত হয়ে উঠেছে। জীবনের গতিপথ কখনো কখনো এমন অচেনা বাঁকে এসে দাঁড়ায়, যেখানে দাঁড়িয়ে পেছনের সব হিসাব-নিকাশ হঠাৎ ওলটপালট হয়ে যায়।\n\n` +
      `"${prompt}"—এই অনুভূতি প্রতিটি নিঃশ্বাসে এক অদ্ভুত প্রেরণা জোগাচ্ছিল। পথ চলতে গিয়ে মানুষ কত মানুষের মুখোমুখি হয়, কিন্তু কিছু কিছু মুহূর্ত জীবনের চিরস্থায়ী জলছবি হয়ে থেকে যায়। মনের গভীরে যে দ্বিধা আর প্রশ্নের দোলাচল ছিল, তা ধীরে ধীরে এক অটল আত্মবিশ্বাসে রূপ নিল। মানুষের আসল পরিচয় তো সেখানে, যেখানে সে নিজের সীমাবদ্ধতাকে অতিক্রম করে নতুন এক সম্ভাবনার দিকে হাত বাড়ায়।\n\n` +
      `দূরের দিগন্তে সূর্য তখন আরও উজ্জ্বল হয়ে উঠছে। এক চিলতে আত্মপ্রত্যয়ের হাসি ফুটে উঠল ঠোঁটের কোণে—সামনে এখনো অনেক পথ বাকি, আর সেই পথেই রচিত হবে বিজয়ের নতুন এক মহাকাব্য।`
    );
  } else {
    // English Narrative
    return (
      `# ${prompt}\n\n` +
      `The rain tapped a steady, melancholic rhythm against the tall parlor window. In the quiet corners of the room, amber lamplight mingled with memories long tucked away. Sometimes, a single thought is all it takes to unravel the delicate tapestry of the past.\n\n` +
      `"${prompt}" resonated with unmistakable clarity. Every chapter of life seems to arrive with its own unspoken tests, yet this moment felt distinct—an intersection between who one had been and who one was becoming. Across the room, an unread letter waited on the mahogany desk, its handwriting carrying echoes of a familiar voice.\n\n` +
      `Outside, the clouds began to part, revealing the first silver crest of moonlight. With a steady breath and renewed resolve, the path forward suddenly became clear. Some stories do not end with goodbye; they merely find a braver beginning.`
    );
  }
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

  const isBengali = /[\u0980-\u09FF]/.test(cleanPrompt);

  // Collect style snippets from trained stories
  const styleSnippets: string[] = [];
  if (inMemoryTrainedStories.length > 0) {
    const matching = inMemoryTrainedStories.filter(
      (s) => (s.language === "bn") === isBengali,
    );
    const pool = matching.length > 0 ? matching : inMemoryTrainedStories;
    pool.slice(-3).forEach((s) => {
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
