from ai.inference.local_provider import LocalStoryProvider
from ai.inference.mock_provider import MockStoryProvider
from ai.inference.provider import GenerationParams, GenerationResult, StoryGenerationProvider


def get_inference_provider() -> StoryGenerationProvider:
    """Returns the configured story generation provider."""
    local_provider = LocalStoryProvider()
    if local_provider.is_adapter_available() or local_provider.check_ollama_alive():
        return local_provider
    return MockStoryProvider()


__all__ = [
    "GenerationParams",
    "GenerationResult",
    "LocalStoryProvider",
    "MockStoryProvider",
    "StoryGenerationProvider",
    "get_inference_provider",
]
