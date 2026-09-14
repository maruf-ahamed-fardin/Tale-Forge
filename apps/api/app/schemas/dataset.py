from datetime import datetime

from pydantic import BaseModel


class DatasetOut(BaseModel):
    id: str
    user_id: str
    filename: str
    original_name: str
    status: str
    word_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DatasetListResponse(BaseModel):
    datasets: list[DatasetOut]
    total: int
