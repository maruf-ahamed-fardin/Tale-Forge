const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

export { ApiError, getToken };
