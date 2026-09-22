function getApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/v1\/?$/, "");
  }
  // In the browser, default to "" so requests hit Next.js route handlers directly (no CORS, no dead localhost)
  if (typeof window !== "undefined") {
    return "";
  }
  return "http://localhost:8000";
}

const API_BASE = getApiBase();

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tf_token");
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401 && auth && typeof window !== "undefined") {
      try {
        localStorage.removeItem("tf_token");
        localStorage.removeItem("tf_user");
      } catch {
        // ignore storage errors
      }
    }
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, detail);
  }


  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface StoryChoice {
  id: string;
  label: string;
  prompt: string;
}

export interface UserOut {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
}

export function authApi() {
  return {
    register: (email: string, password: string, display_name = "") =>
      request<TokenResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name }),
      }, false),

    login: (email: string, password: string) =>
      request<TokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }, false),

    me: () => request<UserOut>("/api/v1/auth/me"),
  };
}

// ─── Stories ─────────────────────────────────────────────────────────────────

export interface StoryListItem {
  id: string;
  title: string;
  genre: string;
  mood: string;
  word_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoryOut extends StoryListItem {
  user_id: string;
  content: string;
  setting: string;
  length_preset: string;
}

export interface StoryListResponse {
  stories: StoryListItem[];
  total: number;
}

export interface StoryCreate {
  title?: string;
  content?: string;
  genre?: string;
  mood?: string;
  setting?: string;
  length_preset?: string;
  is_favorite?: boolean;
}

export function storiesApi() {
  return {
    list: (skip = 0, limit = 50) =>
      request<StoryListResponse>(`/api/v1/stories?skip=${skip}&limit=${limit}`),

    create: (data: StoryCreate) =>
      request<StoryOut>("/api/v1/stories", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    get: (id: string) => request<StoryOut>(`/api/v1/stories/${id}`),

    update: (id: string, data: Partial<StoryCreate>) =>
      request<StoryOut>(`/api/v1/stories/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<void>(`/api/v1/stories/${id}`, { method: "DELETE" }),
  };
}

// ─── Datasets ─────────────────────────────────────────────────────────────────

export interface DatasetOut {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  status: string;
  word_count: number;
  created_at: string;
}

export interface DatasetListResponse {
  datasets: DatasetOut[];
  total: number;
}

export function datasetsApi() {
  return {
    list: (skip = 0, limit = 50) =>
      request<DatasetListResponse>(`/api/v1/datasets?skip=${skip}&limit=${limit}`),

    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const token = getToken();
      return fetch(`${API_BASE}/api/v1/datasets/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new ApiError(res.status, body.detail ?? res.statusText);
        }
        return res.json() as Promise<DatasetOut>;
      });
    },
  };
}

// ─── Generation ───────────────────────────────────────────────────────────────

export interface GenerateRequest {
  title?: string;
  prompt?: string;
  genre?: string;
  mood?: string;
  setting?: string;
  character_name?: string;
  character_role?: string;
  character_traits?: string;
  length_preset?: string;
  language?: string;
  temperature?: number;
}

export interface GenerateResponse {
  text: string;
  word_count: number;
  provider: string;
  finish_reason: string;
}

export function generateApi() {
  return {
    generate: (data: GenerateRequest) =>
      request<GenerateResponse>("/api/v1/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  };
}

// ─── Training ─────────────────────────────────────────────────────────────────

export interface TrainingRunCreate {
  dataset_id?: string | null;
  base_model?: string;
  lora_rank?: number;
  epochs?: number;
}

export interface TrainingRunOut {
  id: string;
  user_id: string;
  dataset_id: string | null;
  status: string;
  base_model: string;
  lora_rank: number;
  epochs: number;
  log_path: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface TrainingRunListResponse {
  runs: TrainingRunOut[];
  total: number;
}

export function trainingApi() {
  return {
    list: (skip = 0, limit = 50) =>
      request<TrainingRunListResponse>(`/api/v1/training/runs?skip=${skip}&limit=${limit}`),
    start: (data: TrainingRunCreate) =>
      request<TrainingRunOut>("/api/v1/training/runs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) =>
      request<TrainingRunOut>(`/api/v1/training/runs/${id}`),
  };
}

// ─── Simple Trainable AI & Story Chat ─────────────────────────────────────────

export function getAccountId(): string {
  if (typeof window === "undefined") return "default_local_author";
  try {
    const rawUser = localStorage.getItem("tf_user");
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user?.id) return String(user.id);
      if (user?.email) return user.email.replace(/[^a-zA-Z0-9_-]/g, "_");
    }
  } catch {
    // ignore
  }
  let localAccountId = localStorage.getItem("tf_account_id");
  if (!localAccountId) {
    localAccountId = `author_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("tf_account_id", localAccountId);
  }
  return localAccountId;
}

export interface TrainedStoryItem {
  id: string;
  title: string;
  word_count: number;
  trained_at: string;
  text?: string;
  language?: string;
  is_default?: boolean;
  genre?: string;
  author_style?: string;
}

export interface AIStatus {
  total_trained_stories: number;
  total_words: number;
  auto_train_enabled: boolean;
  default_stories_count?: number;
  personal_trained_stories?: number;
  default_stories?: TrainedStoryItem[];
  personal_stories?: TrainedStoryItem[];
  default_words?: number;
  personal_words?: number;
  account_id?: string;
  recent_stories: TrainedStoryItem[];
  trained_stories?: TrainedStoryItem[];
  chat_count: number;
  active_model?: string;
}

export function simpleAiApi() {
  const getCustomApiKey = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("tf_gemini_api_key") || "";
  };

  return {
    chat: (
      message: string,
      autoTrain = true,
      imageBase64?: string,
      imageType?: string,
      model = "gemini-1.5-flash",
      persona = "default",
      trainingScope = "hybrid",
      accountId?: string,
    ) => {
      const activeAccountId = accountId || getAccountId();
      const apiKey = getCustomApiKey();
      const headers: Record<string, string> = {
        "x-account-id": activeAccountId,
      };
      if (apiKey) headers["x-gemini-key"] = apiKey;

      return request<{
        story: string;
        prompt: string;
        auto_trained: boolean;
        total_trained_count: number;
        model?: string;
        training_scope?: string;
        account_id?: string;
        choices?: StoryChoice[];
      }>(
        "/api/v1/ai/chat",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            message,
            auto_train: autoTrain,
            image_base64: imageBase64,
            image_type: imageType,
            model,
            persona,
            training_scope: trainingScope,
            account_id: activeAccountId,
          }),
        },
        true,
      );
    },
    trainText: (text: string, title = "My Story", accountId?: string) => {
      const activeAccountId = accountId || getAccountId();
      return request<{
        success: boolean;
        message: string;
        total_trained_stories: number;
        total_words: number;
        personal_trained_stories?: number;
        personal_words?: number;
        account_id?: string;
      }>(
        "/api/v1/ai/train",
        {
          method: "POST",
          headers: { "x-account-id": activeAccountId },
          body: JSON.stringify({ text, title, account_id: activeAccountId }),
        },
        true,
      );
    },
    trainFile: async (file: File, title = "", accountId?: string) => {
      const activeAccountId = accountId || getAccountId();
      const form = new FormData();
      form.append("file", file);
      if (title) form.append("title", title);
      form.append("account_id", activeAccountId);

      const token = getToken();
      const headers: Record<string, string> = {
        "x-account-id": activeAccountId,
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/ai/train-file`, {
        method: "POST",
        headers,
        body: form,
      });
      if (!res.ok) {
        let errDetail = "File upload training failed.";
        try {
          const b = await res.json();
          errDetail = b.detail || errDetail;
        } catch {}
        throw new Error(errDetail);
      }
      return res.json();
    },
    status: (accountId?: string) => {
      const activeAccountId = accountId || getAccountId();
      return request<AIStatus>(
        `/api/v1/ai/status?account_id=${encodeURIComponent(activeAccountId)}`,
        { headers: { "x-account-id": activeAccountId } },
        true,
      );
    },
    deleteTrainedStory: (id: string, accountId?: string) => {
      const activeAccountId = accountId || getAccountId();
      return request<{
        success: boolean;
        message: string;
        status?: AIStatus;
      }>(
        `/api/v1/ai/trained/${encodeURIComponent(id)}?account_id=${encodeURIComponent(activeAccountId)}`,
        {
          method: "DELETE",
          headers: { "x-account-id": activeAccountId },
        },
        true,
      );
    },
    reset: (accountId?: string) => {
      const activeAccountId = accountId || getAccountId();
      return request<{ success: boolean; message: string; account_id?: string }>(
        `/api/v1/ai/reset?account_id=${encodeURIComponent(activeAccountId)}`,
        {
          method: "POST",
          headers: { "x-account-id": activeAccountId },
          body: JSON.stringify({ account_id: activeAccountId }),
        },
        true,
      );
    },
  };
}


export { ApiError, getToken };

