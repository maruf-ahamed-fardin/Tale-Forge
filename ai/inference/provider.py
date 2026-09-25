from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from typing import Any


@dataclass
class GenerationParams:
    title: str = ""
    prompt: str = ""
    genre: str = "Drama"
    mood: str = "Emotional"
    setting: str = ""
    character_name: str = ""
    character_role: str = ""
    character_traits: str = ""
    length_preset: str = "Medium"
    language: str = "bn"
    temperature: float = 0.8
    top_p: float = 0.9
    max_new_tokens: int = 1024
    # Recent conversation ending with the user's latest message ({"role": "user"|"assistant", "content": str}).
    # When set, it replaces `prompt` as the model input so follow-ups act on the previous story.
    messages: list[dict[str, str]] | None = None
    # Overrides the default system prompt (must match the one the adapter was trained with).
    system_prompt: str = ""


@dataclass
class GenerationResult:
    text: str
    word_count: int
    finish_reason: str = "stop"
    provider: str = "taleforge-engine"


class StoryGenerationProvider(ABC):
    """Abstract base class for all TaleForge story generation providers."""

    @abstractmethod
    async def generate(self, params: GenerationParams) -> GenerationResult:
        """Generate a complete story based on creative direction parameters."""
        pass

    @abstractmethod
    async def stream(self, params: GenerationParams) -> AsyncGenerator[str, None]:
        """Stream story tokens or chunks as they are generated."""
        pass
