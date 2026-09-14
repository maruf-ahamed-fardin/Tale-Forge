import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dataset_upload_and_list(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    # Upload a valid txt manuscript
    file_content = b"Once upon a time in a peaceful village by the Padma river."
    files = {"file": ("chapter_one.txt", io.BytesIO(file_content), "text/plain")}

    upload_res = await client.post(
        "/api/v1/datasets/upload",
        headers=auth_headers,
        files=files,
    )
    assert upload_res.status_code == 201
    dataset = upload_res.json()
    assert dataset["original_name"] == "chapter_one.txt"
    assert dataset["status"] == "raw"

    # List datasets
    list_res = await client.get("/api/v1/datasets", headers=auth_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(d["original_name"] == "chapter_one.txt" for d in list_data["datasets"])


@pytest.mark.asyncio
async def test_dataset_upload_invalid_extension(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    # Upload an unsupported file type (.exe)
    files = {"file": ("malware.exe", io.BytesIO(b"binary content"), "application/octet-stream")}

    upload_res = await client.post(
        "/api/v1/datasets/upload",
        headers=auth_headers,
        files=files,
    )
    assert upload_res.status_code == 415
