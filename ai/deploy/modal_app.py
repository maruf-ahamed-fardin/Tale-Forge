"""TaleForge on Modal: train the LoRA adapter and serve it from a serverless GPU.

This is the production home of the "TaleForge LoRA" chat model. Nothing runs on your own PC:
training happens on a rented GPU for a few minutes, the adapter is stored in a Modal Volume,
and the same GPU class serves generation requests on demand (scales to zero when idle).

The served HTTP contract is identical to the local FastAPI endpoint (/api/v1/generate/local),
so the web app only needs LORA_MODEL_URL pointed at the deployed URL.

One-time setup (see ai/deploy/README.md for the full walkthrough):
    pip install modal
    python -m modal setup                                    # log in (free tier includes monthly GPU credit)
    python -m modal secret create taleforge-local-model-token LOCAL_MODEL_TOKEN=<same value as the web app>

Train (uploads data/datasets/train.jsonl, ~5-15 minutes on a T4):
    python ai/data_pipeline/bootstrap_dataset.py   # or export your own stories from the Train AI page
    python -m modal run ai/deploy/modal_app.py --train

Deploy the generation endpoint (prints the public URL):
    python -m modal deploy ai/deploy/modal_app.py

Then set LORA_MODEL_URL=https://<workspace>--taleforge-lora-storymodel-web.modal.run on the web app.
"""

from pathlib import Path

import modal

APP_NAME = "taleforge-lora"
MODELS_DIR = "/models"
ADAPTER_DIR = f"{MODELS_DIR}/adapters/taleforge-lora"
DEFAULT_BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
# T4 (16 GB) is the cheapest GPU and is enough to train (QLoRA) and serve a 1.5B or 3B model.
GPU = "T4"

app = modal.App(APP_NAME)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch",
        "transformers",
        "peft",
        "datasets",
        "accelerate",
        "bitsandbytes",
        "fastapi[standard]",
    )
    .env({"HF_HOME": f"{MODELS_DIR}/hf-cache"})  # base-model downloads persist in the volume
    .add_local_python_source("ai")  # ai/training and ai/inference from this repository
)

models_volume = modal.Volume.from_name("taleforge-models", create_if_missing=True)
token_secret = modal.Secret.from_name("taleforge-local-model-token")


@app.function(image=image, gpu=GPU, timeout=3 * 60 * 60, volumes={MODELS_DIR: models_volume})
def train(train_jsonl: bytes, base_model: str = DEFAULT_BASE_MODEL, epochs: int = 3, lora_r: int = 16) -> dict:
    """Fine-tunes the LoRA adapter on the uploaded dataset and stores it in the volume."""
    import json

    from ai.training.train_lora import run_training

    dataset_path = Path("/tmp/train.jsonl")
    dataset_path.write_bytes(train_jsonl)
    sample_count = sum(1 for line in train_jsonl.decode("utf-8").splitlines() if line.strip())
    print(f"Training on {sample_count} samples with base model {base_model}")

    output_dir = Path(ADAPTER_DIR)
    run_training(
        base_model_name=base_model,
        dataset_path=dataset_path,
        output_dir=output_dir,
        epochs=epochs,
        lora_r=lora_r,
        lora_alpha=lora_r * 2,
    )
    models_volume.commit()

    metadata = json.loads((output_dir / "training_metadata.json").read_text(encoding="utf-8"))
    return {"adapter_dir": ADAPTER_DIR, **metadata}


@app.cls(
    image=image,
    gpu=GPU,
    volumes={MODELS_DIR: models_volume},
    secrets=[token_secret],
    scaledown_window=5 * 60,  # keep the model loaded 5 minutes after the last request
    timeout=10 * 60,
)
@modal.concurrent(max_inputs=4)
class StoryModel:
    """Loads base model + adapter once per container and serves the local-generate HTTP contract."""

    @modal.enter()
    def load(self):
        from ai.inference.local_provider import LocalStoryProvider

        models_volume.reload()  # pick up an adapter trained after this container image was built
        self.provider = LocalStoryProvider(adapter_path=Path(ADAPTER_DIR))
        if self.provider.is_adapter_available():
            self.provider._load_hf_model()
            print("TaleForge LoRA adapter loaded")
        else:
            print(f"No adapter at {ADAPTER_DIR}: run `python -m modal run ai/deploy/modal_app.py --train` first")

    @modal.asgi_app()
    def web(self):
        import os
        import secrets

        from fastapi import FastAPI, Header, HTTPException, status
        from fastapi.concurrency import run_in_threadpool
        from pydantic import BaseModel, Field

        from ai.inference.provider import GenerationParams

        expected_token = os.environ.get("LOCAL_MODEL_TOKEN", "")
        provider = self.provider
        api = FastAPI(title="TaleForge LoRA (Modal)")

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

        @api.get("/health")
        def health():
            return {"status": "ok", "adapter_loaded": provider.is_adapter_available()}

        @api.post("/api/v1/generate/local")
        async def generate_local(request: LocalGenerateRequest, x_local_model_token: str | None = Header(default=None)):
            if not expected_token:
                raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "LOCAL_MODEL_TOKEN secret is not set on Modal.")
            if not secrets.compare_digest(x_local_model_token or "", expected_token):
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid local model token.")
            if not provider.is_adapter_available():
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    "No trained adapter yet. Run: python -m modal run ai/deploy/modal_app.py --train",
                )
            params = GenerationParams(
                prompt=request.prompt,
                messages=[{"role": m.role, "content": m.content} for m in request.messages] if request.messages else None,
                system_prompt=request.system_prompt or "",
                language="bn",
                temperature=request.temperature,
                max_new_tokens=request.max_new_tokens,
            )
            try:
                result = await run_in_threadpool(provider.generate_with_adapter, params)
            except Exception as exc:  # noqa: BLE001
                raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"LoRA generation failed: {exc}") from exc
            return {
                "text": result.text,
                "word_count": result.word_count,
                "provider": "modal-lora-model",
                "finish_reason": result.finish_reason,
            }

        return api


@app.local_entrypoint()
def main(
    train: bool = False,
    dataset: str = "data/datasets/train.jsonl",
    base_model: str = DEFAULT_BASE_MODEL,
    epochs: int = 3,
    lora_r: int = 16,
):
    """`python -m modal run ai/deploy/modal_app.py --train` uploads the dataset and trains on a Modal GPU."""
    if not train:
        print("Nothing to do. Use --train to fine-tune, or `python -m modal deploy ai/deploy/modal_app.py` to serve.")
        return
    dataset_path = Path(dataset)
    if not dataset_path.exists():
        raise SystemExit(f"Dataset not found: {dataset_path}. Run ai/data_pipeline/bootstrap_dataset.py first.")
    result = globals()["train"].remote(dataset_path.read_bytes(), base_model, epochs, lora_r)
    print("Training finished:", result)
    print("Now deploy the endpoint with: modal deploy ai/deploy/modal_app.py")
