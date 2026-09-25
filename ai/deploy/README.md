# Running your own TaleForge model in production

The "TaleForge LoRA" chat model is your own fine-tuned model (an open-source base such as Qwen 2.5 plus a
LoRA adapter trained on your stories). It needs a GPU, which a normal web host (Vercel, Render, a shared
server) does not have. This folder deploys it to [Modal](https://modal.com), a serverless GPU host:

- **Training** runs on a rented GPU for a few minutes, then the GPU is released.
- **Serving** loads the model on demand and scales to zero when nobody is chatting, so idle time costs nothing.
- The endpoint speaks the same HTTP contract as the local FastAPI server, so the web app only needs one URL.

Modal's free tier includes a monthly compute credit that covers occasional training and light traffic.
Any other GPU host (RunPod, Lambda, a cloud VM) works too: run `apps/api` there with the adapter in
`models/adapters/taleforge-lora` and point `LORA_MODEL_URL` at it.

## Free route (no credit card): Colab + Hugging Face Space

Modal and every other GPU host require a card on file. Without one, use this route. It is free and
stays online, but generation runs on a CPU, so each story takes roughly 40-90 seconds.

1. **Train in Colab** (free T4 GPU, needs only a Google account). Build the dataset (section 2 below),
   open `notebooks/TaleForge_Training_Colab.ipynb` in Colab, upload `data/datasets/train.jsonl`, and run
   the cells through **Step 8**. Step 8 merges the adapter, compresses the model to a single GGUF file and
   uploads it to your Hugging Face account (free, create one at https://huggingface.co/join and make a
   *write* token at https://huggingface.co/settings/tokens).
2. **Create the Space.** On https://huggingface.co/new-space choose *Docker* → *Blank*, free CPU hardware.
   Upload the four files from `ai/deploy/hf-space/` (`Dockerfile`, `app.py`, `requirements.txt`, `README.md`).
3. **Configure the Space** in *Settings → Variables and secrets*: variable `MODEL_REPO` (printed by Step 8c,
   e.g. `username/taleforge-lora-gguf`), variable `MODEL_FILE` (printed by Step 8c), secret `LOCAL_MODEL_TOKEN`
   (same value as the web app), and secret `HF_TOKEN` (a *read* token, because the model repo is private).
4. Wait for the build (about 5 minutes), then open `https://<username>-<space-name>.hf.space/health`.
   It should report `"model_loaded": true`.
5. **Point the web app at it**: `LORA_MODEL_URL=https://<username>-<space-name>.hf.space` and
   `LOCAL_MODEL_TOKEN=<same value>` in Vercel (or `apps/web/.env.local`).

A free Space sleeps after 48 hours without traffic and wakes on the next request (about a minute).
When you get a card later, switch to the Modal route below for GPU speed; the web app config is the same.

## Paid route: Modal (serverless GPU)

### 1. One-time setup

```bash
pip install modal
python -m modal setup                                    # opens the browser to log in
python -m modal secret create taleforge-local-model-token LOCAL_MODEL_TOKEN=<a long random value>
```

Use the **same** `LOCAL_MODEL_TOKEN` value in the web app's environment (`.env.local` locally, the
project's environment variables on Vercel).

### 2. Build the dataset

Your own stories give the model your voice. Add them on the **Train AI** page, then export:

```bash
python ai/data_pipeline/export_dataset.py --account <your account id>
```

Until you have 30+ stories, build the starter set instead. It merges your stories (if any) with the
bundled Bengali literature and teaches the model to follow instructions such as "ei golpo ta aro boro koro":

```bash
python ai/data_pipeline/bootstrap_dataset.py --account <your account id>
```

Both write `data/datasets/train.jsonl`.

### 3. Train on a Modal GPU

```bash
python -m modal run ai/deploy/modal_app.py --train
# options: --base-model Qwen/Qwen2.5-3B-Instruct --epochs 3 --lora-r 16
```

The adapter is saved in the `taleforge-models` volume. Re-run this whenever you add stories.

### 4. Deploy the endpoint

```bash
python -m modal deploy ai/deploy/modal_app.py
```

Modal prints the URL, for example `https://<workspace>--taleforge-lora-storymodel-web.modal.run`.
Check it: `GET <url>/health` returns `{"status": "ok", "adapter_loaded": true}`.

### 5. Point the web app at it

Set on the web app (Vercel project settings, or `apps/web/.env.local`):

```
LORA_MODEL_URL=https://<workspace>--taleforge-lora-storymodel-web.modal.run
LOCAL_MODEL_TOKEN=<same value as the Modal secret>
```

Select **TaleForge LoRA Adapter** in chat (it is the default). The first request after idle time takes
30-60 seconds while the model loads; later requests take a few seconds.

### Costs and choices

| Choice | Effect |
| --- | --- |
| `GPU = "T4"` (default) | Cheapest option, enough for 1.5B and 3B models |
| `scaledown_window` | How long the model stays loaded after the last request. Longer = fewer cold starts, more cost |
| `--base-model Qwen/Qwen2.5-3B-Instruct` | Better instruction following, slower and slightly costlier per request |
| Colab notebook (`notebooks/`) | Free alternative for training only; upload the adapter to the volume with `python -m modal volume put taleforge-models <local adapter dir> /adapters/taleforge-lora` |
