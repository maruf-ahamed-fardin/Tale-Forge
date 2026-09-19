from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.dataset import DatasetListResponse, DatasetOut
from app.services.auth import get_current_user
from app.services.dataset import list_datasets, save_upload

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("", response_model=DatasetListResponse)
async def list_all(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetListResponse:
    datasets, total = await list_datasets(db, current_user.id, skip=skip, limit=limit)
    return DatasetListResponse(datasets=datasets, total=total)  # type: ignore[arg-type]


@router.post("/upload", response_model=DatasetOut, status_code=status.HTTP_201_CREATED)
async def upload(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetOut:
    dataset = await save_upload(db, current_user.id, file)
    return DatasetOut.model_validate(dataset)
