import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generate_story_bn(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    res = await client.post(
        "/api/v1/generate",
        headers=auth_headers,
        json={
            "title": "বৃষ্টির গান",
            "genre": "Romance",
            "mood": "Emotional",
            "setting": "ধানমন্ডি লেকের পাড়",
            "character_name": "অনীক",
            "character_role": "চিত্রশিল্পী",
            "length_preset": "Short",
            "language": "bn",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "text" in data
    assert len(data["text"]) > 0
    assert data["word_count"] > 0
    assert data["provider"] == "taleforge-mock"


@pytest.mark.asyncio
async def test_generate_story_en(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    res = await client.post(
        "/api/v1/generate",
        headers=auth_headers,
        json={
            "title": "The Forgotten Key",
            "genre": "Mystery",
            "mood": "Dark",
            "setting": "An abandoned manor",
            "character_name": "Detective Hayes",
            "character_role": "Investigator",
            "length_preset": "Short",
            "language": "en",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "Detective Hayes" in data["text"]
    assert data["word_count"] > 0
