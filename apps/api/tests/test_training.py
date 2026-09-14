import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_training_run_lifecycle(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    # 1. Start a training run
    create_res = await client.post(
        "/api/v1/training/runs",
        headers=auth_headers,
        json={
            "base_model": "bangla-llama-7b",
            "lora_rank": 16,
            "epochs": 3,
        },
    )
    assert create_res.status_code == 201
    run = create_res.json()
    run_id = run["id"]
    assert run["base_model"] == "bangla-llama-7b"
    assert run["lora_rank"] == 16
    assert run["epochs"] == 3
    assert run["status"] == "queued"

    # 2. List training runs
    list_res = await client.get("/api/v1/training/runs", headers=auth_headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 1
    assert any(r["id"] == run_id for r in data["runs"])

    # 3. Get specific run
    get_res = await client.get(f"/api/v1/training/runs/{run_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == run_id
