from datetime import datetime

from pydantic import BaseModel, Field


class StoryCreate(BaseModel):
    title: str = Field(default="Untitled Story", max_length=500)
    content: str = Field(default="")
    genre: str = Field(default="", max_length=100)
    mood: str = Field(default="", max_length=100)
    setting: str = Field(default="", max_length=500)
    length_preset: str = Field(default="Medium", max_length=50)
    is_favorite: bool = False


class StoryUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=500)
    content: str | None = None
    genre: str | None = Field(default=None, max_length=100)
    mood: str | None = Field(default=None, max_length=100)
    setting: str | None = Field(default=None, max_length=500)
    length_preset: str | None = Field(default=None, max_length=50)
    is_favorite: bool | None = None


class StoryOut(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    genre: str
    mood: str
    setting: str
    length_preset: str
    word_count: int
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StoryListItem(BaseModel):
    id: str
    title: str
    genre: str
    mood: str
    word_count: int
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StoryListResponse(BaseModel):
    stories: list[StoryListItem]
    total: int
