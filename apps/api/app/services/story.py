from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.story import Story
from app.schemas.story import StoryCreate, StoryUpdate


def _word_count(text: str) -> int:
    return len(text.split()) if text.strip() else 0


async def create_story(db: AsyncSession, user_id: str, data: StoryCreate) -> Story:
    story = Story(
        user_id=user_id,
        title=data.title,
        content=data.content,
        genre=data.genre,
        mood=data.mood,
        setting=data.setting,
        length_preset=data.length_preset,
        word_count=_word_count(data.content),
        is_favorite=data.is_favorite,
    )
    db.add(story)
    await db.flush()
    await db.refresh(story)
    return story


async def get_stories(
    db: AsyncSession,
    user_id: str,
    *,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Story], int]:
    total_result = await db.execute(
        select(func.count()).select_from(Story).where(Story.user_id == user_id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Story)
        .where(Story.user_id == user_id)
        .order_by(Story.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    stories = list(result.scalars().all())
    return stories, total


async def get_story(db: AsyncSession, user_id: str, story_id: str) -> Story:
    result = await db.execute(
        select(Story).where(Story.id == story_id, Story.user_id == user_id)
    )
    story = result.scalar_one_or_none()
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    return story


async def update_story(
    db: AsyncSession, user_id: str, story_id: str, data: StoryUpdate
) -> Story:
    story = await get_story(db, user_id, story_id)
    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(story, field, value)
    if "content" in update_data:
        story.word_count = _word_count(story.content)
    await db.flush()
    await db.refresh(story)
    return story


async def delete_story(db: AsyncSession, user_id: str, story_id: str) -> None:
    story = await get_story(db, user_id, story_id)
    await db.delete(story)
