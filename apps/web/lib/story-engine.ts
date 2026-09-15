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
 * Derives an elegant Bengali title from user input (even if in Banglish / English).
 */
function getBengaliStoryTitle(prompt: string): string {
  const p = prompt.toLowerCase().trim();
  if (/prem|valobasha|bhalobasha|romance|romantic/i.test(p)) {
    if (/brishti|rain/i.test(p)) return "বৃষ্টিভেজা শ্রাবণের একাকী প্রেম";
    if (/raat|night/i.test(p)) return "নিস্তব্ধ রাতের অব্যক্ত ভালোবাসা";
    return "হৃদয়ের অলিন্দে এক চিলতে প্রেম";
  }
  if (/bhoy|voot|ghost|horror|bhoutik/i.test(p)) return "অন্ধকার রাতের ছায়ামূর্তি";
  if (/rohoshyo|mystery|detective|goyenda/i.test(p)) return "অমীমাংসিত রহস্যের সন্ধানে";
  if (/brishti|rain/i.test(p)) return "বৃষ্টির রিনিঝিনি আর ফেলে আসা স্মৃতি";
  if (/smriti|nostalgia|sad|kosto/i.test(p)) return "স্মৃতির পাতা ও একাকী গোধূলি";

  // If already in Bengali script, clean and use it
  if (/[\u0980-\u09FF]/.test(prompt)) {
    return prompt.slice(0, 50);
  }
  return "এক অচেনা গল্পের সূচনা";
}

/**
 * TaleForge's rich procedural story synthesizer for offline / keyless live generation.
 * Always produces rich Bengali prose from any single seed line.
 */
function composeSmartStory(
  prompt: string,
  isBengali: boolean,
  styleSnippets: string[],
): string {
  const title = getBengaliStoryTitle(prompt);

  // Theme detection across Bengali, Banglish, and English
  const isRomance =
    /প্রেম|ভালোবাসা|ভালবাসা|রোমান্টিক|বৃষ্টি|স্মৃতি|love|romance|rain|romantic|prem|valobasha|bhalobasha/i.test(
      prompt,
    );
  const isHorror =
    /ভয়|ভয়|ভূত|ভৌতিক|আতঙ্ক|কবর|অন্ধকার|horror|ghost|scary|fear|shadow|bhoy|voot|bhoutik/i.test(prompt);
  const isMystery =
    /রহস্য|ডিটেকটিভ|গোয়েন্দা|খুন|চিঠি|mystery|detective|secret|investigation|rohoshyo|goyenda/i.test(
      prompt,
    );

  // Weave style snippet if available
  let styleAddition = "";
  if (styleSnippets.length > 0) {
    const sample = styleSnippets[0].split(/[।?!]/)[0].trim();
    if (sample && sample.length > 10) {
      styleAddition = `\n\nমনের গভীরে যেন সুরের মতো প্রতিধ্বনিত হচ্ছিল: "${sample}..."।`;
    }
  }

  if (isRomance) {
    return (
      `# ${title}\n\n` +
      `শ্রাবণের একটানা অবিরাম বৃষ্টির ধারায় শহরের অলিগলি তখন পুরোপুরি ভিজে একাকার। জানালার কাঁচ বেয়ে গড়িয়ে পড়া জলের ফোঁটার দিকে তাকিয়েছিল অনিন্দিতা। টেবিলের ওপর রাখা ধোঁয়া ওঠা কফির কাপ থেকে এক মিষ্টি সুবাস ঘরের বাতাসে ছড়িয়ে পড়ছিল। এমন নির্জন বিকেলে বহু বছর আগে ফেলে আসা কোনো এক চেনা মুখের স্মৃতি হঠাৎ করেই মনকে বড় ব্যাকুল করে তোলে।\n\n` +
      `ঠিক তখনই দরজার কাছে মৃদু কড়া নাড়ার শব্দ হলো। দরজা খুলতেই দেখা গেল বৃষ্টিতে ভিজে একাকার হয়ে দাঁড়িয়ে আছে সেই মানুষটি—যার সঙ্গে শেষ দেখা হয়েছিল বহু কাল আগে। ঠোঁটের কোণে সেই চিরপরিচিত শান্ত হাসি, চোখের তারায় জমে থাকা হাজারো কথা। "${prompt}"—এই যেন শুধু একটি ভাবনা নয়, দুজনের নিঃশব্দ হৃদয়ের ভেতর এতদিন ধরে পুষে রাখা এক গভীর ভালোবাসা। কোনো অভিযোগ ছিল না, কোনো দ্বিধা ছিল না; শুধু বৃষ্টির রিনিঝিনি শব্দের মাঝে দুটি হৃদয়ের নীরব কথোপকথন চলতে লাগল।\n\n` +
      `কফি কাপের উষ্ণতায় দুটি হাত একে অপরকে ছুঁয়ে গেল। জীবনের টানাপোড়েনে যা কিছু হারিয়ে গিয়েছিল বলে মনে হয়েছিল, এই এক পলকেই যেন সব আবার নতুন অর্থে ফিরে এল। বাইরে ঝড়ের গতি তখন মন্থর হয়ে এসেছে, মেঘের ফাঁক গলে আকাশে উঁকি দিচ্ছে নরম এক চিলতে আলো।\n\n` +
      `ভালোবাসা হয়তো সত্যিই কখনো ফুরিয়ে যায় না। সময়ের স্রোতে কেবল লুকিয়ে থাকে একান্তে, সঠিক সময়ে নতুন কোনো পূর্ণতার আশায় জেগে ওঠার জন্য।${styleAddition}`
    );
  }

  if (isHorror) {
    return (
      `# ${title}\n\n` +
      `রাত তখন ঠিক আড়াইটা। ঝিঁঝিঁ পোকার একঘেয়ে ডাকও যেন একসময় হঠাৎ করেই অদ্ভুত নিস্তব্ধতায় থেমে গেল। চারপাশের থমথমে বাতাসে ভেসে আসছিল ভেজা মাটির সাথে পুরনো চন্দন আর জীর্ণ কাঠের এক অচেনা মিশ্র গন্ধ। ঘরের কোণে রাখা শতবর্ষী কাঠের আলমারিটা মৃদু শব্দে কেঁপে উঠল।\n\n` +
      `দেয়ালে নিভু নিভু মোমবাতির আলোয় পড়ে থাকা ছায়াটা যেন নিজের ইচ্ছেমতো এক পা নড়ে উঠল। বুকের ভেতর এক বরফশীতল ভয়ের স্রোত নেমে গেল। "${prompt}"—এই চিন্তা মাথায় আসতেই সমস্ত শরীর শিউরে উঠল। হঠাৎ দরজার হাতলটা কড়াৎ করে নিচে নামল এবং পাল্লাটি নিঃশব্দে খুলে গেল। করিডোরে কোনো মানুষ নেই, কেবল ঘন জমাটবাঁধা অন্ধকার আর এক শীতল শ্বাসের স্পর্শ ঘাড়ের চামড়ায় এসে বিঁধল।\n\n` +
      `দম বন্ধ হয়ে আসছিল। পেছনে ফিরতেই অন্ধকারের মাঝে ভেসে উঠল দুটি জ্বলজ্বলে অপলক চোখের আলো। আতঙ্কের তীব্রতায় চিৎকার করতে গিয়েও গলা দিয়ে কোনো স্বর বের হলো না... ঘরটি তখন পুরোপুরি ডুবে গেল অনন্ত এক কালচে শীতলতায়।${styleAddition}`
    );
  }

  if (isMystery) {
    return (
      `# ${title}\n\n` +
      `পুরনো ঢাকার গোলকধাঁধার মতো সরু গলির শেষ প্রান্তে সেই হলুদ বাড়িটা দাঁড়িয়ে ছিল শত বছরের এক অদ্ভুত নীরবতা বুকে চেপে। ঘড়ির কাঁটার তীব্র টিকটিক শব্দ জানান দিচ্ছিল হাতে সময় আর মাত্র কয়েক মিনিট। টেবিলে ছড়িয়ে ছিল কিছু পুরনো হলদে হয়ে যাওয়া চিঠি আর একটি জীর্ণ ব্রোঞ্জের চাবি।\n\n` +
      `চিঠির শেষ পাতায় গাঢ় লাল কালিতে লেখা একটি অস্পষ্ট সংকেত। "${prompt}"—এই সূত্রটাই হয়তো বহু বছর ধরে লুকিয়ে রাখা সেই পারিবারিক রহস্যের শেষ চাবিকাঠি। ঠিক তখনই কাঠের সিঁড়িতে ভারী বুটের পদশব্দ প্রতিধ্বনিত হলো। কেউ একজন খুব সন্তর্পণে উপরে উঠে আসছে।\n\n` +
      `অর্ণব চাবিটা পকেটে পুরে পেছনের গুপ্ত দরজার দিকে পা বাড়াল। সত্য প্রকাশের এই খেলায় ভুল করার কোনো সুযোগ নেই। আজ রাতেই হয়তো এই অন্ধকার অধ্যায়ের চূড়ান্ত ইতি ঘটতে চলেছে।${styleAddition}`
    );
  }

  // Universal deep literary Bengali story
  return (
    `# ${title}\n\n` +
    `কুয়াশাচ্ছন্ন এক নির্জন ভোরের নরম আলোয় আকাশ তখন সবে রঙিন হতে শুরু করেছে। নদীর পাড়ে দাঁড়িয়ে বাতাসে ঠান্ডা এক শিহরণ অনুভব হচ্ছিল। জীবনের গতিপথ কখন যে কীভাবে বদলে যায়, তার কোনো আগাম পূর্বাভাস থাকে না। পেছনের ফেলে আসা দিনগুলোর স্মৃতি তখন এক সুদূর স্বপ্নের মতো মনে হচ্ছিল।\n\n` +
    `"${prompt}"—এই ভাবনাটি যেন অন্তরের গভীরে এক নতুন আশার আলো জ্বেলে দিল। পথ চলতে গিয়ে মানুষ কত মানুষের সংস্পর্শে আসে, কিন্তু কিছু কিছু অনুভূতি সারাজীবনের সঙ্গী হয়ে থেকে যায়। মনের সব দ্বিধা আর সংশয়ের মেঘ কেটে গিয়ে জন্ম নিল এক গভীর আত্মবিশ্বাস। জীবনের আসল সৌন্দর্য তো পরাজয়ে নয়, বারবার নতুন করে ভালোবাসতে শেখায়।\n\n` +
    `দূরের দিগন্তে সূর্য তখন পূর্ণ তেজে উজ্জ্বল হয়ে উঠেছে। নদীর জলে আলোর কণাগুলো তারার মতো ঝিলমিল করছে। এক চিলতে তৃপ্তির হাসি মুখে নিয়ে সামনে এগিয়ে গেল সে—একটি সুন্দর ভোরের সূচনায় রচিত হলো জীবনের নতুন এক সোনালী অধ্যায়।${styleAddition}`
  );
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
