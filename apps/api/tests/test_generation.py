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


# ─── Local LoRA endpoint (/api/v1/generate/local) ────────────────────────────

from types import SimpleNamespace

from ai.inference import GenerationResult
from app.api.v1 import generate as generate_module


def _set_local_token(monkeypatch: pytest.MonkeyPatch, token: str) -> None:
    monkeypatch.setattr(generate_module, "get_settings", lambda: SimpleNamespace(local_model_token=token))


@pytest.mark.asyncio
async def test_local_generate_disabled_without_token(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _set_local_token(monkeypatch, "")
    res = await client.post("/api/v1/generate/local", json={"prompt": "বৃষ্টির গল্প"})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_local_generate_rejects_wrong_token(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _set_local_token(monkeypatch, "secret")
    res = await client.post(
        "/api/v1/generate/local",
        headers={"x-local-model-token": "wrong"},
        json={"prompt": "বৃষ্টির গল্প"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_local_generate_reports_missing_adapter(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _set_local_token(monkeypatch, "secret")
    monkeypatch.setattr(generate_module._local_provider, "is_adapter_available", lambda: False)
    res = await client.post(
        "/api/v1/generate/local",
        headers={"x-local-model-token": "secret"},
        json={"prompt": "বৃষ্টির গল্প"},
    )
    assert res.status_code == 503
    assert "No trained LoRA adapter" in res.json()["detail"]


@pytest.mark.asyncio
async def test_local_generate_uses_adapter(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _set_local_token(monkeypatch, "secret")
    monkeypatch.setattr(generate_module._local_provider, "is_adapter_available", lambda: True)
    monkeypatch.setattr(
        generate_module._local_provider,
        "generate_with_adapter",
        lambda params: GenerationResult(text=f"গল্প: {params.prompt}", word_count=2, provider="local-lora-model"),
    )
    res = await client.post(
        "/api/v1/generate/local",
        headers={"x-local-model-token": "secret"},
        json={"prompt": "বৃষ্টির গল্প"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["provider"] == "local-lora-model"
    assert data["text"] == "গল্প: বৃষ্টির গল্প"
