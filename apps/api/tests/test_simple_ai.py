import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_simple_ai_train_and_chat(client: AsyncClient) -> None:
    # 1. Train model on a story
    train_res = await client.post(
        "/api/v1/ai/train",
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
    status_res = await client.get("/api/v1/ai/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["total_trained_stories"] >= 1

    # 3. Chat and generate story with auto-train enabled
    chat_res = await client.post(
        "/api/v1/ai/chat",
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
