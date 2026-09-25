"""TaleForge LoRA model server for a Hugging Face Space (free CPU tier).

Serves the same HTTP contract as the local FastAPI endpoint (/api/v1/generate/local), so the web app
only needs LORA_MODEL_URL pointed at this Space. The model is the fine-tuned adapter merged into its
base and quantized to GGUF (built by the last cells of notebooks/TaleForge_Training_Colab.ipynb),
run on CPU with llama.cpp.

Space settings (Settings → Variables and secrets):
    MODEL_REPO         your Hub repo holding the GGUF, e.g. "username/taleforge-lora-gguf"
    MODEL_FILE         file name inside that repo (default: taleforge-lora.Q4_K_M.gguf)
    LOCAL_MODEL_TOKEN  secret; the same value as the web app's LOCAL_MODEL_TOKEN
    HF_TOKEN           secret; only needed when MODEL_REPO is private
"""

import os
import secrets
import threading
import time

from fastapi import FastAPI, Header, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

MODEL_REPO = os.environ.get("MODEL_REPO", "")
MODEL_FILE = os.environ.get("MODEL_FILE", "taleforge-lora.Q4_K_M.gguf")
LOCAL_MODEL_TOKEN = os.environ.get("LOCAL_MODEL_TOKEN", "")
CONTEXT_TOKENS = int(os.environ.get("CONTEXT_TOKENS", "4096"))
THREADS = int(os.environ.get("THREADS", str(os.cpu_count() or 2)))

# Must match TRAINING_SYSTEM_PROMPT in apps/web/lib/system-prompt.ts (the web app also sends it per request).
DEFAULT_SYSTEM_PROMPT = (
    "You are TaleForge AI, an expert literary novelist specializing in Bengali literature. "
    "Follow the user's latest instruction exactly. If they ask to expand, continue, shorten, rewrite or change "
    "the previous story, work on that story from the conversation and keep its title, characters and events. "
    "Otherwise write a new story. Write in Bengali unless the user asks for English."
)

api = FastAPI(title="TaleForge LoRA (Hugging Face Space)")
_model = None
_model_error = ""
_load_lock = threading.Lock()  # llama.cpp is not thread-safe: one generation at a time


class ChatTurn(BaseModel):
    role: str
    content: str = Field(..., min_length=1, max_length=8000)


class LocalGenerateRequest(BaseModel):
    # Same schema as apps/api/app/schemas/generation.py::LocalGenerateRequest
    prompt: str = Field(..., min_length=1, max_length=2000)
    messages: list[ChatTurn] | None = Field(default=None, max_length=12)
    system_prompt: str | None = Field(default=None, max_length=2000)
    temperature: float = Field(default=0.8, ge=0.1, le=1.5)
    max_new_tokens: int = Field(default=1024, ge=64, le=2048)


def load_model():
    """Downloads the GGUF from the Hub (once) and loads it into llama.cpp."""
    global _model, _model_error
    if _model is not None:
        return _model
    with _load_lock:
        if _model is not None:
            return _model
        try:
            from huggingface_hub import hf_hub_download
            from llama_cpp import Llama

            if not MODEL_REPO:
                raise RuntimeError("MODEL_REPO is not set on the Space (Settings → Variables).")
            started = time.time()
            path = hf_hub_download(MODEL_REPO, MODEL_FILE, token=os.environ.get("HF_TOKEN") or None)
            print(f"Downloaded {MODEL_FILE} in {time.time() - started:.0f}s, loading into llama.cpp")
            _model = Llama(model_path=path, n_ctx=CONTEXT_TOKENS, n_threads=THREADS, verbose=False)
            _model_error = ""
            print("TaleForge model ready")
        except Exception as exc:  # noqa: BLE001
            _model_error = f"{type(exc).__name__}: {exc}"
            print("Model load failed:", _model_error)
            raise
    return _model


def build_messages(request: LocalGenerateRequest) -> list[dict]:
    turns = [
        {"role": m.role, "content": m.content}
        for m in (request.messages or [])
        if m.role in ("user", "assistant") and m.content.strip()
    ]
    while turns and turns[0]["role"] != "user":
        turns.pop(0)
    if not turns:
        turns = [{"role": "user", "content": request.prompt}]
    return [{"role": "system", "content": request.system_prompt or DEFAULT_SYSTEM_PROMPT}, *turns]


def generate(request: LocalGenerateRequest) -> str:
    model = load_model()
    with _load_lock:
        out = model.create_chat_completion(
            messages=build_messages(request),
            temperature=request.temperature,
            top_p=0.9,
            repeat_penalty=1.1,
            max_tokens=request.max_new_tokens,
        )
    return (out["choices"][0]["message"]["content"] or "").strip()


@api.on_event("startup")
def warm_up():
    # Load in the background so the Space reports healthy quickly; the first request waits for it.
    threading.Thread(target=lambda: _safe_load(), daemon=True).start()


def _safe_load():
    try:
        load_model()
    except Exception:  # noqa: BLE001
        pass


@api.get("/")
@api.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None, "model_error": _model_error, "repo": MODEL_REPO}


@api.post("/api/v1/generate/local")
async def generate_local(request: LocalGenerateRequest, x_local_model_token: str | None = Header(default=None)):
    if not LOCAL_MODEL_TOKEN:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "LOCAL_MODEL_TOKEN secret is not set on the Space.")
    if not secrets.compare_digest(x_local_model_token or "", LOCAL_MODEL_TOKEN):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid local model token.")
    try:
        text = await run_in_threadpool(generate, request)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"Model not ready: {exc}") from exc
    if not text:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "The model returned an empty story.")
    return {
        "text": text,
        "word_count": len(text.split()),
        "provider": "hf-space-lora-gguf",
        "finish_reason": "stop",
    }
