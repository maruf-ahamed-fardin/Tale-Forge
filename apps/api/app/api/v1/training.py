from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.training import TrainingRunCreate, TrainingRunListResponse, TrainingRunOut
from app.services.auth import get_current_user
from app.services.training import create_training_run, get_training_run, list_training_runs

router = APIRouter(prefix="/training", tags=["training"])


@router.get("/runs", response_model=TrainingRunListResponse)
async def list_runs(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrainingRunListResponse:
    runs, total = await list_training_runs(db, current_user.id, skip=skip, limit=limit)
    return TrainingRunListResponse(
        runs=[TrainingRunOut.model_validate(r) for r in runs],
        total=total,
    )


@router.post("/runs", response_model=TrainingRunOut, status_code=status.HTTP_201_CREATED)
async def start_run(
    data: TrainingRunCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrainingRunOut:
    run = await create_training_run(db, current_user.id, data)
    return TrainingRunOut.model_validate(run)


@router.get("/runs/{run_id}", response_model=TrainingRunOut)
async def get_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TrainingRunOut:
    run = await get_training_run(db, current_user.id, run_id)
    return TrainingRunOut.model_validate(run)
