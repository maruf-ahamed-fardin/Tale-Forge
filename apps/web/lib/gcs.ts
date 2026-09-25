/**
 * Minimal Google Cloud Storage + auth helpers (JSON API over fetch).
 * Used for persistent story storage and Vertex AI tuning, so the app works on hosts without a persistent disk.
 */
import { GoogleAuth } from "google-auth-library";

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

/** Thrown when a conditional write loses a race: the object changed since it was read. */
export class PreconditionFailedError extends Error {}

export function getStorageBucket(): string | null {
  const bucket = process.env.GCS_BUCKET || "";
  return bucket ? bucket.replace(/^gs:\/\//, "").replace(/\/+$/, "") : null;
}

export function isCloudStorageConfigured(): boolean {
  return getStorageBucket() !== null;
}

function requireBucket(): string {
  const bucket = getStorageBucket();
  if (!bucket) throw new Error("Cloud storage is not configured: set GCS_BUCKET.");
  return bucket;
}

let auth: GoogleAuth | null = null;

async function getAccessToken(): Promise<string> {
  if (!auth) {
    // On hosts like Vercel the service-account key is passed as a JSON string env var.
    // Without it, Application Default Credentials are used (gcloud login / GCP runtime).
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    auth = new GoogleAuth({
      scopes: [CLOUD_PLATFORM_SCOPE],
      ...(rawKey ? { credentials: JSON.parse(rawKey) } : {}),
    });
  }
  const token = await auth.getAccessToken();
  if (!token) throw new Error("Could not get a Google Cloud access token. Check GOOGLE_SERVICE_ACCOUNT_JSON.");
  return token;
}

export async function googleFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
}

export async function readGoogleError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error?.message || res.statusText || `HTTP ${res.status}`;
}

/** Reads an object. `generation` identifies this version, for a later conditional write. */
export async function readObject(name: string): Promise<{ text: string; generation: string } | null> {
  const bucket = requireBucket();
  const res = await googleFetch(
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}?alt=media`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Cloud Storage read failed: ${await readGoogleError(res)}`);
  return { text: await res.text(), generation: res.headers.get("x-goog-generation") || "" };
}

/**
 * Writes an object. With `ifGenerationMatch`, the write only succeeds if the object is still at that
 * version ("0" = must not exist yet); otherwise PreconditionFailedError is thrown.
 */
export async function writeObject(
  name: string,
  body: string,
  contentType: string,
  ifGenerationMatch?: string,
): Promise<void> {
  const bucket = requireBucket();
  const precondition = ifGenerationMatch ? `&ifGenerationMatch=${ifGenerationMatch}` : "";
  const res = await googleFetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(name)}${precondition}`,
    { method: "POST", headers: { "Content-Type": contentType }, body },
  );
  if (res.status === 412) throw new PreconditionFailedError(`${name} was changed by another request`);
  if (!res.ok) throw new Error(`Cloud Storage upload failed: ${await readGoogleError(res)}`);
}

/** Reads a JSON object, or null if it doesn't exist. */
export async function readJsonObject<T>(name: string): Promise<T | null> {
  const obj = await readObject(name);
  return obj ? (JSON.parse(obj.text) as T) : null;
}

/**
 * Read-modify-write of a JSON object. The write only succeeds if nobody else wrote in between;
 * otherwise `mutate` is re-applied to a fresh copy, so concurrent updates are never lost.
 * `initial` supplies the value when the object doesn't exist yet.
 */
export async function updateJsonObject<T, R>(
  name: string,
  initial: () => T,
  mutate: (value: T) => R,
): Promise<R> {
  const maxAttempts = 8;
  for (let attempt = 1; ; attempt++) {
    const obj = await readObject(name);
    const value = obj ? (JSON.parse(obj.text) as T) : initial();
    const result = mutate(value);
    try {
      // "0" = create only if still absent
      await writeObject(name, JSON.stringify(value, null, 2), "application/json", obj ? obj.generation : "0");
      return result;
    } catch (err) {
      if (!(err instanceof PreconditionFailedError) || attempt >= maxAttempts) throw err;
      // Random backoff so concurrent writers don't collide again in lockstep
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 150 * attempt));
    }
  }
}
