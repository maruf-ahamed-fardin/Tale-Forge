from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    title: str = Field(default="", max_length=200)
    prompt: str = Field(default="", max_length=1000)
    genre: str = Field(default="Drama", max_length=50)
    mood: str = Field(default="Emotional", max_length=50)
    setting: str = Field(default="", max_length=500)
    character_name: str = Field(default="", max_length=100)
    character_role: str = Field(default="", max_length=100)
    character_traits: str = Field(default="", max_length=200)
    length_preset: str = Field(default="Medium", max_length=20)
    language: str = Field(default="bn", max_length=10)
    temperature: float = Field(default=0.8, ge=0.1, le=1.5)


class LocalGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    temperature: float = Field(default=0.8, ge=0.1, le=1.5)
    max_new_tokens: int = Field(default=1024, ge=64, le=2048)


class GenerateResponse(BaseModel):
    text: str
    word_count: int
    provider: str
    finish_reason: str = "stop"
