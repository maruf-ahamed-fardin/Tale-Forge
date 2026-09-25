/**
 * Fine-tunes Gemini on a user's own stories with Vertex AI supervised tuning, then serves the
 * tuned model. Everything lives in Google Cloud (dataset + job state in a GCS bucket), so it
 * works on hosts with no GPU and no persistent disk.
 *
 * Tuned Gemini 2.5 models are billed per token like the base model — no hourly endpoint cost.
 * Training itself is billed per training token (dataset tokens x epochs).
 */
import { getStorageBucket, googleFetch, readGoogleError, readObject, writeObject } from "@/lib/gcs";
import {
  GEMINI_TUNING_CHUNKS,
  TRAINING_SYSTEM_PROMPT,
  buildTrainingSamples,
  countWords,
  getOwnStories,
} from "@/lib/training-dataset";

// Vertex AI rejects tuning datasets with fewer examples than this
export const MIN_TUNING_EXAMPLES = 16;

const ACTIVE_JOB_STATES = new Set([
  "JOB_STATE_QUEUED",
  "JOB_STATE_PENDING",
  "JOB_STATE_RUNNING",
  "JOB_STATE_UPDATING",
  "JOB_STATE_CANCELLING",
]);

interface VertexConfig {
  project: string;
  location: string;
  bucket: string;
  baseModel: string;
}

export interface TuningJobInfo {
  job_name: string;
  state: string;
  base_model: string;
  created_at: string;
  updated_at: string;
  story_count: number;
  word_count: number;
  sample_count: number;
  error?: string;
}

export interface TuningState {
  account_id: string;
  current_job?: TuningJobInfo;
  // The model chat uses. Kept while a newer job is training, replaced only when that job succeeds.
  active_endpoint?: string;
  active_since?: string;
}

export function getVertexConfig(): VertexConfig | null {
  const project = process.env.GOOGLE_CLOUD_PROJECT || "";
  const bucket = getStorageBucket();
  if (!project || !bucket) return null;
  return {
    project,
    bucket,
    location: process.env.VERTEX_LOCATION || "us-central1",
    baseModel: process.env.VERTEX_TUNING_BASE_MODEL || "gemini-2.5-flash",
  };
}

export function isVertexTuningConfigured(): boolean {
  return getVertexConfig() !== null;
}

function requireConfig(): VertexConfig {
  const config = getVertexConfig();
  if (!config) {
    throw new Error(
      "Cloud training is not configured: set GOOGLE_CLOUD_PROJECT, GCS_BUCKET and GOOGLE_SERVICE_ACCOUNT_JSON.",
    );
  }
  return config;
}

function vertexBaseUrl(config: VertexConfig): string {
  return `https://${config.location}-aiplatform.googleapis.com/v1`;
}

function sanitizeAccountId(accountId: string): string {
  return accountId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "default_local_author";
}

function stateObjectName(accountId: string): string {
  return `taleforge/${sanitizeAccountId(accountId)}/tuning.json`;
}

async function loadState(accountId: string): Promise<TuningState> {
  const obj = await readObject(stateObjectName(accountId));
  return obj ? (JSON.parse(obj.text) as TuningState) : { account_id: sanitizeAccountId(accountId) };
}

async function saveState(state: TuningState) {
  await writeObject(stateObjectName(state.account_id), JSON.stringify(state, null, 2), "application/json");
}

// ─── Tuning jobs ─────────────────────────────────────────────────────────────

/** Builds the dataset from the account's own stories, uploads it, and starts a Vertex AI tuning job. */
export async function startTuning(accountId: string): Promise<TuningState> {
  const config = requireConfig();
  const safeId = sanitizeAccountId(accountId);

  const state = await loadState(safeId);
  if (state.current_job && ACTIVE_JOB_STATES.has(state.current_job.state)) {
    throw new Error("A training job is already running for this account. Wait for it to finish.");
  }

  const stories = getOwnStories(safeId);
  const samples = buildTrainingSamples(stories, GEMINI_TUNING_CHUNKS);
  if (samples.length < MIN_TUNING_EXAMPLES) {
    throw new Error(
      `Not enough of your own writing yet: ${samples.length} training examples from ${stories.length} stories, but Google requires at least ${MIN_TUNING_EXAMPLES}. Add more stories on the Train AI page (roughly ${MIN_TUNING_EXAMPLES * GEMINI_TUNING_CHUNKS.maxChunkChars} characters in total).`,
    );
  }

  // Vertex AI Gemini tuning JSONL format
  const jsonl =
    samples
      .map((s) =>
        JSON.stringify({
          systemInstruction: { parts: [{ text: TRAINING_SYSTEM_PROMPT }] },
          contents: [
            { role: "user", parts: [{ text: s.instruction }] },
            { role: "model", parts: [{ text: s.output }] },
          ],
        }),
      )
      .join("\n") + "\n";

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const datasetObject = `taleforge/${safeId}/datasets/${timestamp}-train.jsonl`;
  await writeObject(datasetObject, jsonl, "application/jsonl");

  // Epoch count and learning rate are left to Vertex AI's recommended defaults
  const res = await googleFetch(
    `${vertexBaseUrl(config)}/projects/${config.project}/locations/${config.location}/tuningJobs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseModel: config.baseModel,
        supervisedTuningSpec: { trainingDatasetUri: `gs://${config.bucket}/${datasetObject}` },
        tunedModelDisplayName: `taleforge-${safeId}`.slice(0, 128),
      }),
    },
  );
  if (!res.ok) throw new Error(`Could not start the training job: ${await readGoogleError(res)}`);
  const job = await res.json();

  const now = new Date().toISOString();
  state.current_job = {
    job_name: job.name,
    state: job.state || "JOB_STATE_PENDING",
    base_model: config.baseModel,
    created_at: now,
    updated_at: now,
    story_count: stories.length,
    word_count: countWords(stories),
    sample_count: samples.length,
  };
  await saveState(state);
  return state;
}

/** Returns the account's tuning state, refreshing the running job from Vertex AI. */
export async function getTuningStatus(accountId: string): Promise<TuningState> {
  const config = requireConfig();
  const state = await loadState(accountId);
  const job = state.current_job;
  if (!job || !ACTIVE_JOB_STATES.has(job.state)) return state;

  const res = await googleFetch(`${vertexBaseUrl(config)}/${job.job_name}`);
  if (!res.ok) throw new Error(`Could not check the training job: ${await readGoogleError(res)}`);
  const remote = await res.json();

  job.state = remote.state || job.state;
  job.updated_at = new Date().toISOString();
  if (remote.error?.message) job.error = remote.error.message;
  if (job.state === "JOB_STATE_SUCCEEDED" && remote.tunedModel?.endpoint) {
    state.active_endpoint = remote.tunedModel.endpoint;
    state.active_since = job.updated_at;
  }
  await saveState(state);
  return state;
}

/** Writes a story with the account's tuned Gemini model. Throws if the account has none yet. */
export async function generateWithTunedGemini(accountId: string, prompt: string): Promise<string> {
  const config = requireConfig();
  const state = await loadState(accountId);
  if (!state.active_endpoint) {
    const running = state.current_job && ACTIVE_JOB_STATES.has(state.current_job.state);
    throw new Error(
      running
        ? "Your model is still training. Check its progress on the Training page."
        : "You don't have a trained model yet. Start cloud training on the Training page first.",
    );
  }

  const res = await googleFetch(`${vertexBaseUrl(config)}/${state.active_endpoint}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: TRAINING_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) throw new Error(`Your tuned model failed to respond: ${await readGoogleError(res)}`);
  const json = await res.json();
  const text = (json?.candidates?.[0]?.content?.parts || [])
    .map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Your tuned model returned an empty story.");
  return text;
}
