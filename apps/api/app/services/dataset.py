import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.models.dataset import Dataset

ALLOWED_EXTENSIONS = {".docx", ".pdf", ".txt"}


async def save_upload(db: AsyncSession, user_id: str, file: UploadFile) -> Dataset:
    settings = get_settings()

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read in bounded chunks to prevent memory exhaustion DoS
    max_bytes = settings.max_upload_mb * 1024 * 1024
    chunks: list[bytes] = []
    total_bytes = 0
    chunk_size = 64 * 1024  # 64 KB

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds {settings.max_upload_mb} MB limit",
            )
        chunks.append(chunk)

    contents = b"".join(chunks)


    # Save to disk
    storage_dir = Path(settings.storage_path) / "datasets" / user_id
    storage_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4()}{suffix}"
    file_path = storage_dir / safe_name
    file_path.write_bytes(contents)

    dataset = Dataset(
        user_id=user_id,
        filename=safe_name,
        original_name=file.filename,
        file_path=str(file_path),
        status="raw",
        word_count=0,
    )
    db.add(dataset)
    await db.flush()
    await db.refresh(dataset)
    return dataset


async def list_datasets(
    db: AsyncSession,
    user_id: str,
    *,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Dataset], int]:
    total_result = await db.execute(
        select(func.count()).select_from(Dataset).where(Dataset.user_id == user_id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Dataset)
        .where(Dataset.user_id == user_id)
        .order_by(Dataset.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    datasets = list(result.scalars().all())
    return datasets, total
