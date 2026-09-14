import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_story_lifecycle(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    # 1. Create a story
    create_res = await client.post(
        "/api/v1/stories",
        headers=auth_headers,
        json={
            "title": "A Rainy Evening in Dhaka",
            "content": "The raindrops beat gently against the old wooden window.",
            "genre": "Drama",
            "mood": "Melancholic",
            "setting": "Dhanmondi Lake",
            "length_preset": "Short",
            "is_favorite": False,
        },
    )
    assert create_res.status_code == 201
    story = create_res.json()
    story_id = story["id"]
    assert story["title"] == "A Rainy Evening in Dhaka"
    assert story["word_count"] == 9

    # 2. List stories
    list_res = await client.get("/api/v1/stories", headers=auth_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(s["id"] == story_id for s in list_data["stories"])

    # 3. Get story by ID
    get_res = await client.get(f"/api/v1/stories/{story_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "A Rainy Evening in Dhaka"

    # 4. Update story
    update_res = await client.put(
        f"/api/v1/stories/{story_id}",
        headers=auth_headers,
        json={
            "title": "A Rainy Evening in Dhaka (Revised)",
            "is_favorite": True,
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "A Rainy Evening in Dhaka (Revised)"
    assert update_res.json()["is_favorite"] is True

    # 5. Delete story
    delete_res = await client.delete(f"/api/v1/stories/{story_id}", headers=auth_headers)
    assert delete_res.status_code == 204

    # 6. Verify story is deleted
    get_after_delete = await client.get(f"/api/v1/stories/{story_id}", headers=auth_headers)
    assert get_after_delete.status_code == 404
