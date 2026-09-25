---
title: TaleForge LoRA
emoji: 📖
colorFrom: purple
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
---

# TaleForge LoRA model server

Serves the TaleForge story model (Bengali literary LoRA merged into Qwen 2.5, GGUF, CPU) with the same
API as the local FastAPI backend: `POST /api/v1/generate/local` with header `x-local-model-token`.

Configure in **Settings → Variables and secrets**:

| Name | Type | Value |
| --- | --- | --- |
| `MODEL_REPO` | variable | Hub repo with the GGUF, e.g. `username/taleforge-lora-gguf` |
| `MODEL_FILE` | variable | `taleforge-lora.Q4_K_M.gguf` (default) |
| `LOCAL_MODEL_TOKEN` | secret | same value as the web app's `LOCAL_MODEL_TOKEN` |
| `HF_TOKEN` | secret | only if `MODEL_REPO` is private |

`GET /health` reports whether the model is loaded.
