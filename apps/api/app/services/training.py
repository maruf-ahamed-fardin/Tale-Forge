import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.training_run import TrainingRun
from app.schemas.training import TrainingRunCreate


async def create_training_run(
    db: AsyncSession,
    user_id: str,
    data: TrainingRunCreate,
) -> TrainingRun:
    run = TrainingRun(
        id=str(uuid.uuid4()),
        user_id=user_id,
        dataset_id=data.dataset_id,
        status="queued",
        base_model=data.base_model,
        lora_rank=data.lora_rank,
        epochs=data.epochs,
        log_path="",
        started_at=datetime.now(UTC),
    )
    db.add(run)
    await db.flush()
    await db.refresh(run)
    return run


async def list_training_runs(
    db: AsyncSession,
    user_id: str,
    *,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[TrainingRun], int]:
    count_stmt = (
        select(func.count())
        .select_from(TrainingRun)
        .where(TrainingRun.user_id == user_id)
    )
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = (
        select(TrainingRun)
        .where(TrainingRun.user_id == user_id)
        .order_by(TrainingRun.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    runs = list(result.scalars().all())
    return runs, total


async def get_training_run(
    db: AsyncSession,
    user_id: str,
    run_id: str,
) -> TrainingRun:
    stmt = select(TrainingRun).where(
        TrainingRun.id == run_id,
        TrainingRun.user_id == user_id,
    )
    result = await db.execute(stmt)
    run = result.scalar_one_or_none()
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training run not found",
        )
    return run
