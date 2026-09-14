from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class TrainingRunCreate(BaseModel):
    dataset_id: str | None = None
    base_model: str = Field(default="bangla-llama-7b", max_length=255)
    lora_rank: int = Field(default=16, ge=4, le=64)
    epochs: int = Field(default=3, ge=1, le=20)


class TrainingRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    dataset_id: str | None
    status: str
    base_model: str
    lora_rank: int
    epochs: int
    log_path: str
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


class TrainingRunListResponse(BaseModel):
    runs: list[TrainingRunOut]
    total: int
