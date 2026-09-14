from ai.inference.mock_provider import MockStoryProvider
from ai.inference.provider import GenerationParams, GenerationResult, StoryGenerationProvider


def get_inference_provider() -> StoryGenerationProvider:
    """Returns the configured story generation provider."""
    # By default, returns the local high-fidelity mock provider
    return MockStoryProvider()


__all__ = [
    "GenerationParams",
    "GenerationResult",
    "MockStoryProvider",
    "StoryGenerationProvider",
    "get_inference_provider",
]
