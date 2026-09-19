import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_simple_ai_unauthenticated_rejected(client: AsyncClient) -> None:
    # Any access without auth header must be rejected with 401
    status_res = await client.get("/api/v1/ai/status")
    assert status_res.status_code == 401

    chat_res = await client.post(
        "/api/v1/ai/chat",
        json={"message": "একটি গল্প লিখুন", "auto_train": False},
    )
    assert chat_res.status_code == 401

    train_res = await client.post(
        "/api/v1/ai/train",
        json={"title": "Unauth Story", "text": "This should be rejected."},
    )
    assert train_res.status_code == 401


@pytest.mark.asyncio
async def test_simple_ai_train_and_chat(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    # 1. Train model on a story
    train_res = await client.post(
        "/api/v1/ai/train",
        headers=auth_headers,
        json={
            "title": "বৃষ্টির দুপুর",
            "text": "একলা জানালায় দাঁড়িয়ে বৃষ্টির ঝমঝম শব্দ শুনতে অদ্ভুত এক মায়া লাগে। পুরনো দিনের কথা মনে পড়ে যায়।",
        },
    )
    assert train_res.status_code == 200
    train_data = train_res.json()
    assert train_data["success"] is True
    assert train_data["total_trained_stories"] >= 1

    # 2. Check status
    status_res = await client.get("/api/v1/ai/status", headers=auth_headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["total_trained_stories"] >= 1

    # 3. Chat and generate story with auto-train enabled
    chat_res = await client.post(
        "/api/v1/ai/chat",
        headers=auth_headers,
        json={
            "message": "একটি সুন্দর রোমান্টিক গল্প বানাও",
            "auto_train": True,
        },
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "story" in chat_data
    assert len(chat_data["story"]) > 0
    assert chat_data["auto_trained"] is True


@pytest.mark.asyncio
async def test_simple_ai_account_isolation(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    # Register a second distinct user
    user2_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "user2@taleforge.io",
            "password": "Password123!",
            "display_name": "Second Author",
        },
    )
    assert user2_res.status_code == 201
    user2_token = user2_res.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    # User 1 trains a private story
    await client.post(
        "/api/v1/ai/train",
        headers=auth_headers,
        json={
            "title": "User 1 Secret Novel",
            "text": "User 1 private narrative text that should never be visible to User 2.",
        },
    )

    # User 2 checks status: User 2's personal trained stories should be 0
    u2_status_res = await client.get("/api/v1/ai/status", headers=user2_headers)
    assert u2_status_res.status_code == 200
    u2_data = u2_status_res.json()
    assert len(u2_data.get("personal_stories", [])) == 0
    assert not any(s.get("title") == "User 1 Secret Novel" for s in u2_data.get("personal_stories", []))

