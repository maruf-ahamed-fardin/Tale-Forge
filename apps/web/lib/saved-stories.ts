import fs from "fs";
import path from "path";

export interface SavedStoryItem {
  id: string;
  title: string;
  content: string;
  genre: string;
  mood: string;
  setting?: string;
  word_count: number;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}

let inMemorySavedStories: SavedStoryItem[] = [];
let savedStoriesLoaded = false;

function getStoragePath(): string {
  try {
    const dir = path.join(process.cwd(), "storage");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, "saved_stories.json");
  } catch {
    return path.join(process.cwd(), "saved_stories.json");
  }
}

function loadStories(): void {
  if (savedStoriesLoaded) return;
  const filePath = getStoragePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      inMemorySavedStories = Array.isArray(parsed) ? parsed : [];
      savedStoriesLoaded = true;
      return;
    }
  } catch {
    // ignore
  }
  savedStoriesLoaded = true;
}

function persistStories(): void {
  try {
    const filePath = getStoragePath();
    fs.writeFileSync(
      filePath,
      JSON.stringify(inMemorySavedStories, null, 2),
      "utf-8",
    );
  } catch {
    // In-memory retains state if fs is read-only
  }
}

export function listSavedStories(): { stories: SavedStoryItem[]; total: number } {
  loadStories();
  return {
    stories: [...inMemorySavedStories].reverse(),
    total: inMemorySavedStories.length,
  };
}

export function getSavedStory(id: string): SavedStoryItem | null {
  loadStories();
  return inMemorySavedStories.find((s) => s.id === id) || null;
}

export function createSavedStory(data: {
  title?: string;
  content?: string;
  genre?: string;
  mood?: string;
  setting?: string;
  is_favorite?: boolean;
}): SavedStoryItem {
  loadStories();

  const content = (data.content || "").trim();
  const words = content.split(/\s+/).filter(Boolean);
  const firstLine = content.split("\n")[0].replace(/[#*]/g, "").trim();
  const title = (data.title || "").trim() || firstLine.slice(0, 50) || "Untitled Story";

  const newStory: SavedStoryItem = {
    id: `saved_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    content,
    genre: data.genre || "Bengali Literature",
    mood: data.mood || "Poetic",
    setting: data.setting || "",
    word_count: words.length,
    is_favorite: Boolean(data.is_favorite),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemorySavedStories.push(newStory);
  persistStories();
  return newStory;
}

export function updateSavedStory(
  id: string,
  updates: Partial<SavedStoryItem>,
): SavedStoryItem | null {
  loadStories();
  const idx = inMemorySavedStories.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  const existing = inMemorySavedStories[idx];
  const updated: SavedStoryItem = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (updates.content) {
    updated.word_count = updates.content.split(/\s+/).filter(Boolean).length;
  }

  inMemorySavedStories[idx] = updated;
  persistStories();
  return updated;
}

export function deleteSavedStory(id: string): boolean {
  loadStories();
  const prevLen = inMemorySavedStories.length;
  inMemorySavedStories = inMemorySavedStories.filter((s) => s.id !== id);
  if (inMemorySavedStories.length !== prevLen) {
    persistStories();
    return true;
  }
  return false;
}
