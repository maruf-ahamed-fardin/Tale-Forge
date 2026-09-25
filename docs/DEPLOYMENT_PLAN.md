# Plan: put TaleForge's own model into production (free route)

Status as of 2026-09-26. Everything in the code is done; the steps below are the manual ones that need
your Google and Hugging Face accounts. Do them in order. Estimated time: about one hour.

## What is already done (no action needed)

- Chat sends the conversation history to the model, so "ei golpo ta aro boro koro" acts on the previous
  story. Follow-up phrases are detected in Bengali, Banglish and English.
- One shared system prompt for training and inference (`apps/web/lib/system-prompt.ts`).
- Default model everywhere is **TaleForge LoRA** (your own model). No Gemini key is needed.
- Training data builder with write / expand / continue samples in three languages
  (`ai/data_pipeline/export_dataset.py`, `bootstrap_dataset.py`). A starter dataset is built:
  `data/datasets/train.jsonl` (218 samples).
- Model servers with the same API for local dev (`apps/api`), a free Hugging Face Space
  (`ai/deploy/hf-space/`) and a paid Modal GPU (`ai/deploy/modal_app.py`).
- Colab notebook trains the adapter and, in Step 8, exports a compressed GGUF model to your Hugging Face account.
- `LOCAL_MODEL_TOKEN` is generated in `.env` and `apps/web/.env.local` (not committed). Use the same value everywhere.

## Step 1: Hugging Face account and tokens (5 min)

1. Create a free account: https://huggingface.co/join (no card).
2. Make two tokens at https://huggingface.co/settings/tokens:
   - a **write** token (used once, in Colab Step 8c)
   - a **read** token (used by the Space as `HF_TOKEN`)

## Step 2: train in Colab (20-30 min, mostly waiting)

1. Open https://colab.research.google.com and upload `notebooks/TaleForge_Training_Colab.ipynb`.
2. Menu **Runtime → Change runtime type → T4 GPU**.
3. Run the cells in order (Shift+Enter):
   - Step 3 asks for a file: upload `data/datasets/train.jsonl`.
   - Step 6 prints a test story and then an **expanded** version of it. Check that the second output
     continues the same story instead of starting a new one.
   - Step 8c asks for the **write** token. At the end it prints `MODEL_REPO` and `MODEL_FILE`. Copy both.
4. Optional: Step 7 downloads `taleforge-lora.zip`. Keep it as a backup of the adapter.

## Step 3: create the Space (10 min)

1. Go to https://huggingface.co/new-space. Name it `taleforge-lora`, SDK **Docker → Blank**, hardware
   **CPU basic (free)**, visibility public or private (both work).
2. In the Space's **Files** tab upload the four files from `ai/deploy/hf-space/`:
   `Dockerfile`, `app.py`, `requirements.txt`, `README.md`.
3. In **Settings → Variables and secrets** add:

   | Name | Kind | Value |
   | --- | --- | --- |
   | `MODEL_REPO` | variable | from Colab Step 8c, e.g. `username/taleforge-lora-gguf` |
   | `MODEL_FILE` | variable | from Colab Step 8c, e.g. `taleforge-lora.Q4_K_M.gguf` |
   | `LOCAL_MODEL_TOKEN` | secret | the value in `.env` |
   | `HF_TOKEN` | secret | the **read** token |

4. Wait for the build (about 5 minutes). Open `https://<username>-taleforge-lora.hf.space/health`.
   It must show `"model_loaded": true`. If `model_error` is not empty, check `MODEL_REPO` / `HF_TOKEN`.

## Step 4: connect the website (5 min)

Set these environment variables where the web app runs (Vercel → Project → Settings → Environment
Variables, and `apps/web/.env.local` for local dev):

```
LORA_MODEL_URL=https://<username>-taleforge-lora.hf.space
LOCAL_MODEL_TOKEN=<same value as in .env>
```

Redeploy the web app. In chat, keep the model set to **TaleForge LoRA Adapter** (default).

## Step 5: test (5 min)

1. Ask for a story: `ekta bristir rat er golpo lekho`.
2. Then: `ei golpo ta aro boro koro`. The reply must keep the same title and characters.
3. Then: `continue koro` and `English e lekho`.

First request after the Space has been idle takes about a minute (model loads). Later ones take
40-90 seconds each on the free CPU. That is the cost of the free route.

## Later: make it sound like you

The starter dataset uses the app's bundled Bengali literature, not your writing. When you have 30+ stories:

1. Add them on the **Train AI** page.
2. `python ai/data_pipeline/bootstrap_dataset.py --account <your account id>` (merges your stories in).
3. Repeat Step 2 (Colab) and, in the Space, just restart it. It downloads the new model file.

## Later: faster replies (needs a card)

With a card on Modal, the same adapter serves from a GPU in a few seconds per story:

```
python -m modal run ai/deploy/modal_app.py --train
python -m modal deploy ai/deploy/modal_app.py
```

Then change `LORA_MODEL_URL` to the Modal URL. Nothing else changes. Details in `ai/deploy/README.md`.

## Not planned yet (decide after Step 5 works)

- Larger base model (Qwen 2.5 3B) for better instruction following. Set `BASE_MODEL` in the notebook.
- Multiple adapters or best-of-N with a judge. Only worth it once a single model works well and a GPU is available.
