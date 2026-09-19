from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.story import StoryCreate, StoryListResponse, StoryOut, StoryUpdate
from app.services.auth import get_current_user
from app.services.story import create_story, delete_story, get_stories, get_story, update_story

router = APIRouter(prefix="/stories", tags=["stories"])


@router.get("", response_model=StoryListResponse)
async def list_stories(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StoryListResponse:
    stories, total = await get_stories(db, current_user.id, skip=skip, limit=limit)
    return StoryListResponse(stories=stories, total=total)  # type: ignore[arg-type]


@router.post("", response_model=StoryOut, status_code=status.HTTP_201_CREATED)
async def create(
    body: StoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StoryOut:
    story = await create_story(db, current_user.id, body)
    return StoryOut.model_validate(story)


@router.get("/{story_id}", response_model=StoryOut)
async def get_one(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StoryOut:
    story = await get_story(db, current_user.id, story_id)
    return StoryOut.model_validate(story)


@router.put("/{story_id}", response_model=StoryOut)
async def update(
    story_id: str,
    body: StoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StoryOut:
    story = await update_story(db, current_user.id, story_id, body)
    return StoryOut.model_validate(story)


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_story(db, current_user.id, story_id)
