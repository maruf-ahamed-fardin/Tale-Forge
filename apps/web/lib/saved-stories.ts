import fs from "fs";
import path from "path";
import { isCloudStorageConfigured, readJsonObject, updateJsonObject } from "@/lib/gcs";

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

// With GCS_BUCKET set, the library is an object in Cloud Storage (survives restarts and serverless
// hosts). Without it, storage/saved_stories.json on local disk.
const LIBRARY_OBJECT = "taleforge/library/saved_stories.json";

// Local-file mode only: this single server is the only writer, so the library can be cached.
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

function readStoriesFromDisk(): SavedStoryItem[] {
  try {
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

async function readStories(): Promise<SavedStoryItem[]> {
  if (isCloudStorageConfigured()) {
    // Before the first cloud write, fall back to the library this server already has on disk
    return (await readJsonObject<SavedStoryItem[]>(LIBRARY_OBJECT)) ?? readStoriesFromDisk();
  }
  if (!savedStoriesLoaded) {
    inMemorySavedStories = readStoriesFromDisk();
    savedStoriesLoaded = true;
  }
  return inMemorySavedStories;
}

/** Read-modify-write of the library (mutate in place); in cloud mode concurrent updates are never lost. */
async function updateStories<R>(mutate: (stories: SavedStoryItem[]) => R): Promise<R> {
  if (isCloudStorageConfigured()) {
    // First cloud write carries over the library this server already has on disk
    return updateJsonObject(LIBRARY_OBJECT, readStoriesFromDisk, mutate);
  }

  const stories = await readStories();
  const result = mutate(stories);
  try {
    fs.writeFileSync(getStoragePath(), JSON.stringify(stories, null, 2), "utf-8");
  } catch {
    // In-memory retains state if fs is read-only
  }
  return result;
}

export async function listSavedStories(): Promise<{ stories: SavedStoryItem[]; total: number }> {
  const stories = await readStories();
  return {
    stories: [...stories].reverse(),
    total: stories.length,
  };
}

export async function getSavedStory(id: string): Promise<SavedStoryItem | null> {
  return (await readStories()).find((s) => s.id === id) || null;
}

export async function createSavedStory(data: {
  title?: string;
  content?: string;
  genre?: string;
  mood?: string;
  setting?: string;
  is_favorite?: boolean;
}): Promise<SavedStoryItem> {
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

  await updateStories((stories) => {
    stories.push(newStory);
  });
  return newStory;
}

export async function updateSavedStory(
  id: string,
  updates: Partial<SavedStoryItem>,
): Promise<SavedStoryItem | null> {
  return updateStories((stories) => {
    const idx = stories.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    const existing = stories[idx];
    const updated: SavedStoryItem = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.content) {
      updated.word_count = updates.content.split(/\s+/).filter(Boolean).length;
    }

    stories[idx] = updated;
    return updated;
  });
}

export async function deleteSavedStory(id: string): Promise<boolean> {
  return updateStories((stories) => {
    const idx = stories.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    stories.splice(idx, 1);
    return true;
  });
}
