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

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse

from ai.inference import GenerationParams, get_inference_provider
from app.models.user import User
from app.schemas.generation import GenerateRequest, GenerateResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/generate", tags=["generation"])


@router.post("", response_model=GenerateResponse, status_code=status.HTTP_200_OK)
async def generate_story(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
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
