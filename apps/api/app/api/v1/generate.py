import sys
from pathlib import Path

# Dynamically locate repository root containing the 'ai' directory
_current = Path(__file__).resolve().parent
while _current.parent != _current:
    if (_current / "ai").is_dir():
        if str(_current) not in sys.path:
            sys.path.insert(0, str(_current))
        break
    _current = _current.parent

import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from ai.inference import GenerationParams, LocalStoryProvider, get_inference_provider
from app.core.rate_limiter import rate_limit
from app.core.settings import get_settings
from app.models.user import User
from app.schemas.generation import GenerateRequest, GenerateResponse, LocalGenerateRequest
from app.services.auth import get_current_user

router = APIRouter(prefix="/generate", tags=["generation"])
rate_limit_generate = rate_limit(max_requests=20, window_seconds=60)

# Module-level so the base model + adapter are loaded once and reused across requests
_local_provider = LocalStoryProvider()


@router.post("", response_model=GenerateResponse, status_code=status.HTTP_200_OK)
async def generate_story(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
    _rate: None = Depends(rate_limit_generate),
) -> GenerateResponse:
    provider = get_inference_provider()
    params = GenerationParams(
        title=request.title,
        prompt=request.prompt,
        genre=request.genre,
        mood=request.mood,
        setting=request.setting,
        character_name=request.character_name,
        character_role=request.character_role,
        character_traits=request.character_traits,
        length_preset=request.length_preset,
        language=request.language,
        temperature=request.temperature,
    )
    result = await provider.generate(params)
    return GenerateResponse(
        text=result.text,
        word_count=result.word_count,
        provider=result.provider,
        finish_reason=result.finish_reason,
    )


@router.post("/stream")
async def stream_story(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
    _rate: None = Depends(rate_limit_generate),
) -> StreamingResponse:
    provider = get_inference_provider()
    params = GenerationParams(
        title=request.title,
        prompt=request.prompt,
        genre=request.genre,
        mood=request.mood,
        setting=request.setting,
        character_name=request.character_name,
        character_role=request.character_role,
        character_traits=request.character_traits,
        length_preset=request.length_preset,
        language=request.language,
        temperature=request.temperature,
    )

    async def token_generator():
        async for chunk in provider.stream(params):
            yield chunk

    return StreamingResponse(token_generator(), media_type="text/plain")


@router.post("/local", response_model=GenerateResponse, dependencies=[Depends(rate_limit_generate)])
async def generate_with_local_adapter(
    request: LocalGenerateRequest,
    x_local_model_token: str | None = Header(default=None),
) -> GenerateResponse:
    """Generates a story with the user's own trained LoRA adapter.

    Called server-side by the web app's "TaleForge LoRA" chat model. Protected by the
    LOCAL_MODEL_TOKEN shared secret instead of user JWT auth. Never falls back to another
    model: a missing adapter or ML dependency is reported as an error.
    """
    expected_token = get_settings().local_model_token
    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Local model endpoint is disabled. Set LOCAL_MODEL_TOKEN on the API server.",
        )
    if not secrets.compare_digest(x_local_model_token or "", expected_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid local model token.")

    if not _local_provider.is_adapter_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"No trained LoRA adapter found at {_local_provider.adapter_path}. "
                "Export your dataset, train in the Colab notebook, and extract the adapter there."
            ),
        )

    params = GenerationParams(
        prompt=request.prompt,
        language="bn",
        temperature=request.temperature,
        max_new_tokens=request.max_new_tokens,
    )
    try:
        result = await run_in_threadpool(_local_provider.generate_with_adapter, params)
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ML dependencies missing on the API server ({exc}). Install: torch transformers peft",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Local LoRA generation failed: {exc}",
        ) from exc

    return GenerateResponse(
        text=result.text,
        word_count=result.word_count,
        provider=result.provider,
        finish_reason=result.finish_reason,
    )
